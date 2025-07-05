/* index.js – fetch latest blogs and enable new post creation */
const repo = "qstar2024/blog_posts";
const latestPostsDiv = document.getElementById("latestPosts");
const newBtn = document.getElementById("newBtn");

async function fetchPosts() {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/manifest.json`);
    const manifest = await res.json();
    // manifest assumed to be array sorted newest first
    const latest = manifest.slice(0, 5);
    latestPostsDiv.innerHTML = latest.map(item => {
      return `<div class=\"liquid-glass-card\" onclick=\"openPost('${item.filename}')\">
        <h3>${item.subject}</h3>
        <div class=\"meta\">Created: ${item.create_time} · Edited: ${item.last_edit_time} · ⏱️ ${item.estimate_read_time} min</div>
      </div>`;}).join("");
  } catch (e) {
    latestPostsDiv.innerHTML = "<p>Failed to load posts.</p>";
    console.error(e);
  }
}

window.openPost = function(filename){
  window.location.href = `reader.html?file=${filename}`;
}

// New post
newBtn.addEventListener('click', () => {
  const now = new Date();
  const fn = now.toISOString().replace(/[-:T]/g, '').slice(0,15); // yyyymmddhhmmss
  window.location.href = `editor.html?file=${fn}.json&new=1`;
});

fetchPosts();
