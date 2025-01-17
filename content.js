// content.js
const extractArticle = () => {
  // Array of potential article container selectors
  const articleSelectors = [
    "article", // Standard semantic HTML5 tag
    '[role="article"]', // ARIA role
    ".article",
    ".post",
    ".entry-content", // Common class names
    "#main-content",
    "#article-content", // Common ID selectors
    "div.content",
    "div.blog-post", // More specific div selectors
    "main", // Main content area
  ];

  // Add these selectors to identify comment sections
  const commentSelectors = [
    "#comments",
    ".comments",
    ".comment-section",
    ".responses",
    '[data-testid="comments-section"]',
    ".discussion",
    ".commentlist",
    ".comment-thread",
    // Common comment section identifiers
    '[id*="comment"]',
    '[class*="comment"]',
    '[id*="disqus"]',
    ".discourse-comments",
    // Social media style comments
    ".fb-comments",
    ".twitter-timeline",
    // Comment form areas
    "#respond",
    ".comment-form",
    ".comment-reply",
  ];

  // Function to calculate content score
  const calculateContentScore = (element) => {
    if (!element) return 0;

    // Check if the element or its ancestors match comment selectors
    const isCommentSection = (el) => {
      if (!el) return false;

      // Check if element matches any comment selector
      if (
        commentSelectors.some((selector) => el.matches && el.matches(selector))
      ) {
        return true;
      }

      // Check parent until body
      return el.parentElement && el !== document.body
        ? isCommentSection(el.parentElement)
        : false;
    };

    // Return negative score for comment sections
    if (isCommentSection(element)) {
      return -100;
    }

    let score = 0;
    const text = element.innerText;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Enhanced scoring system
    score += Math.min(wordCount / 50, 10); // Base word count score

    // Bonus for article indicators
    const hasArticleStructure = element.querySelector("h1, h2, h3, p");
    if (hasArticleStructure) score += 5;

    // Bonus for article metadata
    const hasMetadata = element.querySelector(
      '[class*="date"], [class*="author"], [class*="meta"]'
    );
    if (hasMetadata) score += 3;

    // Check for common article-related tags
    const importantTags = element.querySelectorAll("h1, h2, p, blockquote");
    score += importantTags.length;

    // Penalize for common non-article indicators
    const links = element.querySelectorAll("a");
    score -= links.length > 20 ? 5 : 0;
    score -= wordCount < 50 ? 5 : 0;

    // Penalize for social sharing buttons
    const hasSocialButtons = element.querySelector(
      '[class*="share"], [class*="social"]'
    );
    if (hasSocialButtons) score -= 3;

    return score;
  };

  // Try multiple selectors to find the best article container
  let bestArticle = null;
  let bestScore = 0;

  for (const selector of articleSelectors) {
    const candidates = document.querySelectorAll(selector);

    candidates.forEach((candidate) => {
      const score = calculateContentScore(candidate);
      if (score > bestScore) {
        bestArticle = candidate;
        bestScore = score;
      }
    });

    // If we find a good match, break the loop
    if (bestScore > 10) break;
  }

  // Fallback to body if no good article found
  if (!bestArticle) {
    bestArticle = document.body;
  }

  let markdownText = "";
  const mainHeading = document.querySelector("h1");

  // Add main title if found
  if (mainHeading) {
    markdownText += `# ${mainHeading.innerText.trim()}\n\n`;
  }

  // Create a structured content extractor
  const processContent = (element) => {
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      // Handle headings
      if (child.tagName.match(/^H[1-6]$/)) {
        const level = child.tagName.charAt(1);
        const headingText = child.innerText.trim();
        // Add extra newline before headings for better spacing
        markdownText += `\n${"#".repeat(level)} ${headingText}\n\n`;
      }
      // Handle paragraphs
      else if (child.tagName === "P") {
        const text = child.innerText.trim();
        if (text.length > 20) {
          markdownText += `${text}\n\n`;
        }
      }
      // Handle lists
      else if (child.tagName === "UL" || child.tagName === "OL") {
        markdownText += "\n";
        const items = child.querySelectorAll("li");
        items.forEach((item, index) => {
          const prefix = child.tagName === "UL" ? "- " : `${index + 1}. `;
          markdownText += `${prefix}${item.innerText.trim()}\n`;
        });
        markdownText += "\n";
      }
      // Handle blockquotes
      else if (child.tagName === "BLOCKQUOTE") {
        markdownText += `> ${child.innerText.trim()}\n\n`;
      }
      // Recursively process nested content
      if (child.children.length > 0) {
        processContent(child);
      }
    }
  };

  // Add this function to clean the extracted content
  const cleanContent = (element) => {
    if (!element) return null;

    // Create a clone to avoid modifying the original DOM
    const clone = element.cloneNode(true);

    // Remove comment sections
    commentSelectors.forEach((selector) => {
      const comments = clone.querySelectorAll(selector);
      comments.forEach((comment) => comment.remove());
    });

    // Remove other unnecessary elements
    const removeSelectors = [
      '[class*="share"]',
      '[class*="social"]',
      '[class*="related"]',
      '[class*="sidebar"]',
      '[class*="advertisement"]',
      "iframe",
      "script",
      "style",
      ".ad",
      ".popup",
      ".newsletter",
    ];

    removeSelectors.forEach((selector) => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });

    return clone;
  };

  if (bestArticle) {
    bestArticle = cleanContent(bestArticle);
    processContent(bestArticle);
  }

  // Add metadata at the bottom
  markdownText += "\n---\n\n";
  markdownText += `Source: ${document.URL}\n`;
  markdownText += `Copied: ${new Date().toLocaleString()}\n`;

  // Clean up extra newlines and spaces
  return markdownText
    .replace(/\n{3,}/g, "\n\n") // Replace multiple newlines with double newlines
    .trim();
};

const countWords = (text) => {
  if (!text) return 0;
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 0).length;
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "copyArticle") {
    const articleText = extractArticle();
    const wordCount = countWords(articleText);
    sendResponse({ article: articleText, wordCount: wordCount });
  }
});
