/* index.js – fetch latest blogs and enable new post creation */
const repo = "qstar2024/blog_posts";
const latestPostsDiv = document.getElementById("latestPosts");

async function fetchPosts() {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/`);
    if (!res.ok) throw new Error(`Failed to fetch repo contents: ${res.statusText}`);
    
    const contents = await res.json();
    const postFiles = contents
      .filter(item => item.type === 'file' && item.name.endsWith('.json'))
      .sort((a, b) => b.name.localeCompare(a.name)) // Sort descending by filename
      .slice(0, 5);

    if (postFiles.length === 0) {
      latestPostsDiv.innerHTML = "<p>No posts found.</p>";
      return;
    }

    const posts = await Promise.all(
      postFiles.map(async (file) => {
        const postRes = await fetch(file.download_url);
        if (!postRes.ok) return null;
        const postData = await postRes.json();
        postData.filename = file.name; // Add filename for the onclick handler
        return postData;
      })
    );

    latestPostsDiv.innerHTML = posts
      .filter(Boolean)
      .map(item => {
        return `<div class="liquid-glass-card" onclick="openPost('${item.filename}')">
          <h3>${item.subject}</h3>
          <div class="meta">Created: ${item.create_time} · Edited: ${item.last_edit_time} · ⏱️ ${item.estimate_read_time} min</div>
        </div>`;
      })
      .join("");
  } catch (e) {
    latestPostsDiv.innerHTML = "<p>Failed to load posts.</p>";
    console.error(e);
  }
}

window.openPost = function(filename){
  window.location.href = `reader.html?file=${filename}`;
}


fetchPosts();

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
