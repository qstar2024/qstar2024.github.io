/* reader.js – display a single blog post */
const repo = "qstar2024/blog_posts";
const url = new URLSearchParams(window.location.search);
const file = url.get('file');
if(!file){ location.href='index.html'; }

const titleEl = document.getElementById('title');
const metaEl = document.getElementById('meta');
const contentEl = document.getElementById('content');

async function loadPost(){
  try{
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/${file}`);
    const post = await res.json();
    titleEl.textContent = post.subject;
    metaEl.textContent = `Created: ${post.create_time} · Edited: ${post.last_edit_time} · ⏱️ ${post.estimate_read_time} min`;
    contentEl.innerHTML = marked.parse(post.body);
  }catch(e){
    contentEl.textContent = 'Failed to load post.';
    console.error(e);
  }
}
loadPost();

// Menu visibility logic
const menu = document.querySelector('.liquid-glass-menu');
let hideTimeout;

function showMenu() {
  menu.classList.add('visible');
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    menu.classList.remove('visible');
  }, 3000);
}

window.addEventListener('scroll', showMenu);
document.addEventListener('click', showMenu);
