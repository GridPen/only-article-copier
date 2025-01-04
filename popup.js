// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  function applyTheme(theme) {
    body.classList.remove("light", "dark");
    body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }

  const savedTheme = localStorage.getItem("theme");
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme(prefersDarkScheme.matches ? "dark" : "light");
  }

  prefersDarkScheme.addEventListener("change", (e) => {
    applyTheme(e.matches ? "dark" : "light");
  });

  document.getElementById("copyButton").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "copyArticle" },
        (response) => {
          if (response && response.article) {
            navigator.clipboard.writeText(response.article).then(() => {
              document.getElementById(
                "status"
              ).innerText = `Article copied to clipboard! Word count: ${response.wordCount}`;
            });
          } else {
            document.getElementById("status").innerText = "No article found.";
          }
        }
      );
    });
  });
});
