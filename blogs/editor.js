/* editor.js – edit or create a post. Requires GitHub OAuth token through popup window */
const repo = "qstar2024/blog_posts";
const params = new URLSearchParams(window.location.search);
const file = params.get('file');
const isNew = params.has('new');
const titleInput = document.getElementById('titleInput');
const bodyDiv = document.getElementById('body');

// Check localStorage for existing token
window.ghToken = localStorage.getItem('ghToken') || null;

if(!file){ location.href='index.html'; }

async function loadIfExisting(){
  if(isNew) return;
  try{
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/${file}`);
    if(res.ok){
      const post = await res.json();
      titleInput.textContent = post.subject;
      bodyDiv.textContent = post.body;
    }
  }catch(e){console.error(e);}  
}
loadIfExisting();

function calcReadTime(text){
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words/300));
}

async function savePost(){
  if(!window.ghToken){
    if(confirm('GitHub authorization required. Open authorization window?')){
      authenticate();
    }
    return;
  }
  const content = {
    create_time: isNew? new Date().toISOString() : undefined,
    last_edit_time: new Date().toISOString(),
    subject: titleInput.textContent.trim() || 'Untitled',
    body: bodyDiv.textContent.trim(),
  };
  content.estimate_read_time = calcReadTime(content.body);
  if(!content.create_time){
    // fetch existing to keep create_time
    try{
      const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/${file}`);
      const old = await res.json();
      content.create_time = old.create_time;
    }catch{}
  }
  const jsonString = JSON.stringify(content, null, 2);
  await commitFile(file, jsonString);
  alert('Saved!');
  location.href='index.html';
}

/**
 * Opens GitHub OAuth popup and sets ghToken
 */
function authenticate(){
  if(window.authInProgress) return;
  window.authInProgress = true;
  
  const clientId = 'Ov23li9lr04ic0z5eEwP';
  const state = Math.random().toString(36).slice(2);
  const redirectUri = encodeURIComponent(window.location.origin + '/blogs/callback.html');
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&state=${state}&redirect_uri=${redirectUri}`;
  const w = window.open(authUrl,'ghauth','width=500,height=600');
  
  const authCheck = setInterval(() => {
    if(w.closed) {
      clearInterval(authCheck);
      window.authInProgress = false;
    }
  }, 500);
  
  window.addEventListener('message', async ev => {
    if(ev.data.type === 'gh_code') {
      try {
        const token = await exchangeCodeForToken(ev.data.code);
        window.ghToken = token;
        localStorage.setItem('ghToken', token);
        
        // Notify user
        alert('GitHub authorization successful!');
        
        // Focus editor window
        window.focus();
      } catch (e) {
        console.error('Token exchange failed:', e);
        alert('Authorization failed. Please try again.');
      }
    }
    else if(ev.data.type === 'gh_error') {
      alert('Authorization failed: ' + (ev.data.message || 'Unknown error'));
    }
  });
}

async function exchangeCodeForToken(code) {
  const response = await fetch('https://your-server.com/exchange-code', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ code })
  });
  
  if (!response.ok) throw new Error('Token exchange failed');
  const data = await response.json();
  return data.token;
}

/**
 * Commit file via GitHub REST API v3
 */
async function commitFile(path,content){
  const apiBase = 'https://api.github.com';
  // Get SHA if exists
  let sha;
  try{
    const res = await fetch(`${apiBase}/repos/${repo}/contents/${path}`);
    if(res.ok){ const data = await res.json(); sha = data.sha; }
  }catch{}
  const res = await fetch(`${apiBase}/repos/${repo}/contents/${path}`,{
    method:'PUT',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'token '+window.ghToken,
    },
    body:JSON.stringify({
      message:`Update ${path}`,
      content:btoa(unescape(encodeURIComponent(content))),
      sha
    })
  });
  if(!res.ok){
    throw new Error('GitHub commit failed');
  }
}

document.getElementById('saveBtn').addEventListener('click', () => {
  if(confirm('Save changes?')) savePost();
});

document.getElementById('giveUpBtn').addEventListener('click', () => {
  if(confirm('Discard changes and leave?')) location.href='index.html';
});

// Only auto-authenticate if token doesn't exist
if(!window.ghToken && !window.authInProgress){
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if(!window.ghToken && !window.authInProgress){
        authenticate();
      }
    }, 1000); // Delay to allow token from localStorage
  });
}
