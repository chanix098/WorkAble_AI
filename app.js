// ============================================================
// WorkAble AI — App Controller Module
// js/app.js
// ============================================================

const App = (() => {
  let state = {
    user: null,
    disability: null,
    jobs: [],
    recommendations: [],
    selectedJob: null,
    activeTab: 'recommended'
  };

  function toast(msg, type = 'info') {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `toast ${type}`;
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  function setProgress(step) {
    const pct = Math.round((step / 6) * 100);
    document.querySelectorAll('.progress-fill').forEach(el => el.style.width = pct + '%');
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      if (i + 1 < step) dot.classList.add('done');
      if (i + 1 === step) dot.classList.add('active');
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');

    btn.classList.add('btn-loading');
    btn.textContent = '';
    btn.disabled = true;

    const { data, error } = await WorkableDB.signIn(email, password);
    btn.classList.remove('btn-loading');
    btn.textContent = 'LOGIN';
    btn.disabled = false;

    if (error) { 
      toast(error.message || 'Invalid email or password', 'error'); 
      return; 
    }

    state.user = data.user;
    toast('Welcome back! 👋', 'success');

    const { data: disab } = await WorkableDB.db.from('disabilities').select('id,disability_type').eq('user_id', state.user.id).maybeSingle();
    if (disab) {
      state.disability = disab;
      await loadJobRecommendations();
    } else {
      showPage('page-disability');
      setProgress(2);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    const btn      = document.getElementById('reg-btn');
    const errEl    = document.getElementById('reg-error');

    if (password !== confirm) {
      errEl.textContent = 'Passwords do not match.';
      errEl.classList.add('show');
      return;
    }
    errEl.classList.remove('show');

    btn.classList.add('btn-loading');
    btn.textContent = '';
    btn.disabled = true;

    const { data, error } = await WorkableDB.signUp(email, password, name);
    btn.classList.remove('btn-loading');
    btn.textContent = 'CREATE ACCOUNT';
    btn.disabled = false;

    if (error) { 
      toast(error.message, 'error'); 
      return; 
    }

    state.user = data.user;
    toast('Account created! 🎉', 'success');
    showPage('page-disability');
    setProgress(2);
  }

  async function handleDisabilitySubmit(e) {
    e.preventDefault();
    const type    = document.getElementById('disability-type').value;
    const details = document.getElementById('disability-details').value;
    const file    = document.getElementById('doc-file').files[0];
    const btn     = document.getElementById('disability-btn');
    const errEl   = document.getElementById('disability-error');

    if (!type) {
      errEl.textContent = 'Please select a disability type.';
      errEl.classList.add('show');
      return;
    }
    errEl.classList.remove('show');

    btn.classList.add('btn-loading');
    btn.textContent = '';
    btn.disabled = true;

    const { data, error } = await WorkableDB.submitDisability(state.user.id, type, details, file || null);
    btn.classList.remove('btn-loading');
    btn.textContent = 'SUBMIT';
    btn.disabled = false;

    if (error) { 
      toast('Submission failed. Please try again.', 'error'); 
      return; 
    }

    state.disability = data;
    showPage('page-submitted');
    setProgress(3);
  }

  async function runAnalysis() {
    showPage('page-analyzing');
    setProgress(4);

    const statusMessages = [
      'Reading your profile...',
      'Matching disability accommodations...',
      'Scoring job compatibility...',
      'Ranking best matches...',
      'Finalizing recommendations...'
    ];
    let i = 0;
    const statusEl = document.getElementById('ai-status-text');
    const interval = setInterval(() => {
      if (statusEl) statusEl.textContent = statusMessages[i % statusMessages.length];
      i++;
    }, 900);

    const { data: jobs } = await WorkableDB.getJobs();
    state.jobs = jobs || [];

    await new Promise(r => setTimeout(r, 4500));

    const disabilityScores = {
      'deaf_mute': { 'Sign Language News Translator': 96, 'Online Chat Support Assistant': 90, 'Content Moderator': 87, 'Transcription Specialist': 82, 'Graphic Designer': 78, 'Data Entry Analyst': 74 },
      'visual':    { 'Online Chat Support Assistant': 94, 'Transcription Specialist': 88, 'Data Entry Analyst': 83, 'Content Moderator': 79, 'Sign Language News Translator': 65, 'Graphic Designer': 45 },
      'mobility':  { 'Data Entry Analyst': 95, 'Online Chat Support Assistant': 92, 'Content Moderator': 89, 'Transcription Specialist': 86, 'Sign Language News Translator': 74, 'Graphic Designer': 80 },
      'cognitive': { 'Transcription Specialist': 91, 'Data Entry Analyst': 88, 'Online Chat Support Assistant': 84, 'Content Moderator': 80, 'Graphic Designer': 76, 'Sign Language News Translator': 70 },
    };

    const typeKey = state.disability?.disability_type || 'mobility';
    const scores  = disabilityScores[typeKey] || disabilityScores['mobility'];

    const jobScores = state.jobs.map(job => ({
      jobId: job.id,
      score: scores[job.title] || Math.floor(Math.random() * 30 + 60)
    }));

    await WorkableDB.saveRecommendations(state.user.id, jobScores);

    clearInterval(interval);
    await loadJobRecommendations();
  }

  async function loadJobRecommendations() {
    const { data } = await WorkableDB.getRecommendations(state.user.id);
    if (data && data.length > 0) {
      state.recommendations = data.map(r => ({ ...r.jobs, match_score: r.match_score }));
    } else {
      const { data: jobs } = await WorkableDB.getJobs();
      state.jobs = jobs || [];
      state.recommendations = state.jobs.map(j => ({ ...j, match_score: Math.floor(Math.random() * 30 + 65) }));
    }
    renderJobsPage();
    showPage('page-jobs');
    setProgress(5);
  }

  function renderJobsPage() {
    const recommended = [...state.recommendations].sort((a,b) => b.match_score - a.match_score);
    const allJobs     = [...(state.jobs.length ? state.jobs : recommended)];

    renderJobList('recommended-list', recommended.slice(0, 6));
    renderJobList('all-jobs-list', allJobs);
  }

  function renderJobList(containerId, jobs) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const icons = { hands: '🤟', chat: '💬', monitor: '🖥️', type: '⌨️', database: '📊', design: '🎨', default: '💼' };

    container.innerHTML = jobs.map((job, i) => `
      <div class="job-card" style="animation-delay:${i * 0.06}s" onclick="App.openJobDetail('${job.id}')">
        <div class="job-card-icon">${icons[job.icon_type] || icons.default}</div>
        <div class="job-card-info">
          <div class="job-card-title">${escapeHtml(job.title)}</div>
          <div class="job-card-desc">${escapeHtml(job.description)}</div>
        </div>
        ${job.match_score ? `<div class="match-badge">${job.match_score}%</div>` : ''}
      </div>
    `).join('');
  }

  async function openJobDetail(jobId) {
    const job = state.recommendations.find(j => j.id === jobId) || state.jobs.find(j => j.id === jobId);
    if (!job) return;
    state.selectedJob = job;
    await renderJobDetail(job);
    showPage('page-job-detail');
    setProgress(6);
  }

  async function renderJobDetail(job) {
    const icons = { hands: '🤟', chat: '💬', monitor: '🖥️', type: '⌨️', database: '📊', design: '🎨', default: '💼' };
    const icon  = icons[job.icon_type] || icons.default;

    document.getElementById('detail-icon').textContent = icon;
    document.getElementById('detail-title').textContent = job.title;
    document.getElementById('detail-company').textContent = job.company;
    document.getElementById('detail-match').textContent = job.match_score ? `${job.match_score}% Match` : '';
    document.getElementById('detail-description').textContent = job.description;
    document.getElementById('detail-work-setup').textContent = `${job.work_setup || 'Remote'} Work`;
    document.getElementById('detail-schedule').textContent = job.is_flexible_schedule ? 'Flexible Schedule' : 'Fixed Hours';

    const skills = job.required_skills || [];
    document.getElementById('detail-skills').innerHTML = skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('');

    const access = job.accessibility_features || [];
    document.getElementById('detail-access').innerHTML = access.map(a => `<li>${escapeHtml(a)}</li>`).join('');

    const btn = document.getElementById('apply-btn');
    const alreadyApplied = await WorkableDB.hasApplied(state.user.id, job.id);
    if (alreadyApplied) {
      btn.textContent = '✓ ALREADY APPLIED';
      btn.disabled = true;
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else {
      btn.textContent = 'APPLY NOW';
      btn.disabled = false;
      btn.style.background = '';
    }
  }

  async function applyToJob() {
    const btn = document.getElementById('apply-btn');
    if (!state.selectedJob || !state.user) return;

    const already = await WorkableDB.hasApplied(state.user.id, state.selectedJob.id);
    if (already) { 
      toast('You already applied for this job!', 'error'); 
      return; 
    }

    btn.classList.add('btn-loading');
    btn.textContent = '';
    btn.disabled = true;

    const { error } = await WorkableDB.applyToJob(state.user.id, state.selectedJob.id);
    btn.classList.remove('btn-loading');
    btn.disabled = false;

    if (error) {
      btn.textContent = 'APPLY NOW';
      toast('Something went wrong. Try again.', 'error');
      return;
    }

    btn.textContent = '✓ APPLIED';
    btn.disabled = true;
    btn.style.background = 'linear-gradient(135deg, #22d3a5, #059669)';
    toast('Application submitted! 🎉', 'success');
  }

  async function logout() {
    await WorkableDB.signOut();
    state = { user: null, disability: null, jobs: [], recommendations: [], selectedJob: null };
    showPage('page-login');
    setProgress(1);
    toast('Logged out successfully', 'info');
  }

  function switchTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.tab-bar .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('recommended-list').style.display = tab === 'recommended' ? '' : 'none';
    document.getElementById('all-jobs-list').style.display    = tab === 'all' ? '' : 'none';
  }

  // Visual Interactive Drag & Drop Controller Core Initialization
  function setupUploadZone() {
    const zone  = document.getElementById('upload-zone');
    const input = document.getElementById('doc-file');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files[0]) {
        input.files = files;
        showFileName(files[0].name);
      }
    });

    input.addEventListener('change', () => {
      if (input.files[0]) showFileName(input.files[0].name);
    });
  }

  function showFileName(name) {
    const zone = document.getElementById('upload-zone');
    const fn   = zone.querySelector('.file-name');
    if (fn) fn.textContent = '📎 ' + name;
    else zone.insertAdjacentHTML('beforeend', `<p class="file-name" style="margin-top:10px;color:var(--primary);font-weight:600;">📎 ${name}</p>`);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function init() {
    const user = await WorkableDB.getUser();
    if (user) {
      state.user = user;
      const { data: disab } = await WorkableDB.db.from('disabilities').select('id,disability_type').eq('user_id', user.id).maybeSingle();
      if (disab) {
        state.disability = disab;
        await loadJobRecommendations();
      } else {
        showPage('page-disability');
        setProgress(2);
      }
    } else {
      showPage('page-login');
      setProgress(1);
    }

    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('reg-form')?.addEventListener('submit', handleRegister);
    document.getElementById('disability-form')?.addEventListener('submit', handleDisabilitySubmit);

    setupUploadZone();

    document.querySelectorAll('.toggle-pw').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = btn.closest('.input-wrap').querySelector('input');
        inp.type  = inp.type === 'password' ? 'text' : 'password';
        btn.textContent = inp.type === 'password' ? '👁' : '🙈';
      });
    });
  }

  return { init, handleLogin, handleRegister, handleDisabilitySubmit, openJobDetail, applyToJob, runAnalysis, switchTab, logout };
})();

// Expose the core system variables explicitly onto the global Window lifecycle context
window.App = App;

document.addEventListener('DOMContentLoaded', App.init);