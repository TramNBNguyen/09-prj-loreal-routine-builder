/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const userInput = document.getElementById("userInput");

/* Store selected products and conversation history */
let selectedProducts =
  JSON.parse(localStorage.getItem("selectedProducts")) || [];
let conversationHistory = [];
let allProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
    return allProducts;
  } catch (error) {
    console.error("Error loading products:", error);
    return [];
  }
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found in this category
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${
      selectedProducts.some((p) => p.id === product.id) ? "selected" : ""
    }" 
         data-product-id="${product.id}"
         onclick="toggleProductSelection(${product.id})">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="brand">${product.brand}</p>
        <button class="description-toggle" onclick="event.stopPropagation(); toggleDescription(${
          product.id
        })">
          <i class="fas fa-info-circle"></i> Info
        </button>
        <div class="product-description" id="desc-${
          product.id
        }" style="display: none;">
          <p>${product.description}</p>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

/* Toggle product description visibility */
function toggleDescription(productId) {
  const descElement = document.getElementById(`desc-${productId}`);
  const isVisible = descElement.style.display !== "none";

  // Hide all descriptions first
  document.querySelectorAll(".product-description").forEach((desc) => {
    desc.style.display = "none";
  });

  // Show this description if it wasn't visible
  if (!isVisible) {
    descElement.style.display = "block";
  }
}

/* Toggle product selection */
function toggleProductSelection(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const existingIndex = selectedProducts.findIndex((p) => p.id === productId);

  if (existingIndex > -1) {
    // Remove product
    selectedProducts.splice(existingIndex, 1);
  } else {
    // Add product
    selectedProducts.push(product);
  }

  // Save to localStorage
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));

  // Update UI
  updateSelectedProductsList();
  updateProductCardStyles();
}

/* Update selected products list display */
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="no-products">No products selected yet</p>';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item">
        <img src="${product.image}" alt="${product.name}">
        <div class="selected-product-info">
          <h4>${product.name}</h4>
          <p>${product.brand}</p>
        </div>
        <button class="remove-product" onclick="removeProduct(${product.id})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `
    )
    .join("");
}

/* Remove product from selection */
function removeProduct(productId) {
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
  updateSelectedProductsList();
  updateProductCardStyles();
}

/* Update product card styles based on selection */
function updateProductCardStyles() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const productId = parseInt(card.dataset.productId);
    const isSelected = selectedProducts.some((p) => p.id === productId);

    if (isSelected) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  const selectedCategory = e.target.value;
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Generate routine using OpenAI API */
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    addMessageToChat(
      "assistant",
      "Please select at least one product to generate a routine."
    );
    return;
  }

  // Show loading message
  addMessageToChat("assistant", "Generating your personalized routine...");

  try {
    const systemPrompt = `You are a professional beauty advisor for L'Oréal. Help users create personalized beauty routines using their selected products. 

Guidelines:
- Focus only on the selected products provided
- Create step-by-step routines based on product categories (skincare, haircare, makeup)
- Provide usage instructions, timing, and tips
- Stay within beauty, skincare, haircare, makeup, and fragrance topics
- Be helpful, professional, and encouraging
- If asked about topics outside beauty/personal care, politely redirect to beauty-related topics

Selected Products: ${JSON.stringify(
      selectedProducts.map((p) => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
      }))
    )}`;

    const response = await fetch(
      "https://loreal-chatbox.cindytram2604.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                "Please create a personalized routine using my selected products.",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Remove loading message
    const messages = chatWindow.querySelectorAll(".message");
    if (messages.length > 0) {
      messages[messages.length - 1].remove();
    }

    // Add the routine to chat
    addMessageToChat("assistant", data.message);

    // Add to conversation history
    conversationHistory.push(
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          "Please create a personalized routine using my selected products.",
      },
      { role: "assistant", content: data.message }
    );
  } catch (error) {
    console.error("Error generating routine:", error);
    // Remove loading message
    const messages = chatWindow.querySelectorAll(".message");
    if (messages.length > 0) {
      messages[messages.length - 1].remove();
    }
    addMessageToChat(
      "assistant",
      "Sorry, I encountered an error generating your routine. Please try again."
    );
  }
}

/* Handle chat form submission */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // Add user message to chat
  addMessageToChat("user", message);

  // Clear input
  userInput.value = "";

  // Show typing indicator
  addMessageToChat("assistant", "Typing...");

  try {
    // Prepare messages for API
    const messages = [
      {
        role: "system",
        content: `You are a professional beauty advisor for L'Oréal. Help users with beauty routines and product questions.

Guidelines:
- Focus on beauty, skincare, haircare, makeup, and fragrance topics
- Be helpful, professional, and encouraging
- If asked about topics outside beauty/personal care, politely redirect
- Reference the user's selected products when relevant

Selected Products: ${JSON.stringify(
          selectedProducts.map((p) => ({
            name: p.name,
            brand: p.brand,
            category: p.category,
            description: p.description,
          }))
        )}`,
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    const response = await fetch(
      "https://loreal-chatbox.cindytram2604.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Remove typing indicator
    const messages_elements = chatWindow.querySelectorAll(".message");
    if (messages_elements.length > 0) {
      messages_elements[messages_elements.length - 1].remove();
    }

    // Add assistant response
    addMessageToChat("assistant", data.message);

    // Update conversation history
    conversationHistory.push(
      { role: "user", content: message },
      { role: "assistant", content: data.message }
    );
  } catch (error) {
    console.error("Error in chat:", error);
    // Remove typing indicator
    const messages_elements = chatWindow.querySelectorAll(".message");
    if (messages_elements.length > 0) {
      messages_elements[messages_elements.length - 1].remove();
    }
    addMessageToChat(
      "assistant",
      "Sorry, I encountered an error. Please try again."
    );
  }
});

/* Add message to chat window */
function addMessageToChat(sender, message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  messageDiv.innerHTML = `
    <div class="message-content">
      ${message.replace(/\n/g, "<br>")}
    </div>
  `;

  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Generate routine button click handler */
generateRoutineBtn.addEventListener("click", generateRoutine);

/* Initialize on page load */
document.addEventListener("DOMContentLoaded", () => {
  updateSelectedProductsList();

  // Add welcome message
  addMessageToChat(
    "assistant",
    'Welcome! Select products from the categories above, then click "Generate Routine" to get started. You can also ask me questions about beauty routines and products.'
  );
});

/* Clear all selections */
function clearAllSelections() {
  selectedProducts = [];
  localStorage.removeItem("selectedProducts");
  updateSelectedProductsList();
  updateProductCardStyles();
}

/* Add clear all button functionality */
document.addEventListener("DOMContentLoaded", () => {
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear All";
  clearBtn.className = "clear-all-btn";
  clearBtn.onclick = clearAllSelections;

  const selectedProductsSection = document.querySelector(".selected-products");
  selectedProductsSection.appendChild(clearBtn);
});
