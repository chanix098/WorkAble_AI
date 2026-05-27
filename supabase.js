// ============================================================
// WorkAble AI — Database Configuration Layer
// js/supabase.js
// ============================================================

const SUPABASE_URL = "https://hjrdebfoesekjgjjgksf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8WZrPD27OFpaiKyjMrzgcQ_XJVYx_k8"; // Ensure this matches your project dashboard key configuration!

const WorkableDB = (() => {
  // Enhanced fallback handling prevents Tracking Protection blockers from breaking operations
  const customStorage = (() => {
    try {
      window.localStorage.setItem('__test', '1');
      window.localStorage.removeItem('__test');
      return window.localStorage;
    } catch (e) {
      console.warn("Storage permission denied by tracking filter settings. Initializing in-memory runtime session handler wrapper.");
      const memStore = {};
      return {
        getItem: (key) => memStore[key] || null,
        setItem: (key, val) => { memStore[key] = String(val); },
        removeItem: (key) => { delete memStore[key]; }
      };
    }
  })();

  const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storage: customStorage
    }
  });

  async function signIn(email, password) {
    return await db.auth.signInWithPassword({ email, password });
  }

  async function signUp(email, password, name) {
    return await db.auth.signUp({ email, password, options: { data: { display_name: name } } });
  }
  
  async function getUser() {
    const { data } = await db.auth.getSession();
    return data?.session?.user || null;
  }
  
  async function signOut() {
    return await db.auth.signOut();
  }

  async function getJobs() {
    return await db.from('jobs').select('*');
  }

  async function getRecommendations(userId) {
    return await db.from('recommendations').select('*, jobs(*)').eq('user_id', userId);
  }

  async function saveRecommendations(userId, scores) {
    const rows = scores.map(s => ({ user_id: userId, job_id: s.jobId, match_score: s.score }));
    return await db.from('recommendations').upsert(rows);
  }

  async function hasApplied(userId, jobId) {
    const { data } = await db.from('applications').select('id').eq('user_id', userId).eq('job_id', jobId).maybeSingle();
    return !!data;
  }

  async function applyToJob(userId, jobId) {
    return await db.from('applications').insert({ user_id: userId, job_id: jobId });
  }

  async function submitDisability(userId, type, details, file) {
    let fileUrl = null;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await db.storage.from('documents').upload(fileName, file);
      if (!uploadError) {
        const { data } = db.storage.from('documents').getPublicUrl(fileName);
        fileUrl = data.publicUrl;
      }
    }
    const { data, error } = await db.from('disabilities').insert({
      user_id: userId,
      disability_type: type,
      details: details,
      document_url: fileUrl
    }).select().single();
    return { data, error };
  }

  return { db, signIn, signUp, getUser, signOut, getJobs, getRecommendations, saveRecommendations, hasApplied, applyToJob, submitDisability };
})();
