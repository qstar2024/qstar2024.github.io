/* index.js – fetch latest blogs and enable new post creation */
const repo = "qstar2024/blog_posts";
const latestPostsDiv = document.getElementById("latestPosts");

async function fetchPosts() {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/`);

    if (!res.ok) throw new Error(`Failed to fetch repo contents: ${res.statusText}`);
    
    const contents = await res.json();

    const filteredContents = contents.filter(item => {
      return item.type === 'file' && item.name.endsWith('.json');
    });

    const sortedContents = filteredContents.sort((a, b) => b.name.localeCompare(a.name));

    const postFiles = sortedContents.slice(0, 5);

    if (postFiles.length === 0) {
      latestPostsDiv.innerHTML = "<p>No posts found.</p>";
      return;
    }

    const posts = await Promise.all(
      postFiles.map(async (file) => {
        const response = await fetch(file.download_url);
        const postData = await response.json();
        return { ...postData, filename: file.name };
      })
    );

    latestPostsDiv.innerHTML = posts
      .filter(Boolean)
      .map(item => {
        return `<div class="liquid-glass-card" onclick="openPost(${JSON.stringify(item.filename)})">
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
