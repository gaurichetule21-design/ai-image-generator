// Get references to all HTML elements we need to interact with
const generateImageForm = document.getElementById('generate-image-form');
const formInput = document.getElementById('input-value');
const imageContainerText = document.getElementById('imageContainerText');
const imageGenerated = document.getElementById('generated-image');
const imageContainer = document.getElementById('images-visible');
const spinner = document.getElementById('spinner');
const generateBtn = document.getElementById('generateBtn');

/**
 * Function to fetch AI-generated images from Pollinations.AI API
 * @param {string} prompt - The text prompt entered by user
 */
async function fetchImages(prompt) {
    try {
        // Show loading state
        generateBtn.disabled = true; // Disable button to prevent multiple clicks
        imageContainerText.innerText = "🎨 Generating your AI image, please wait...";
        spinner.style.display = "block"; // Show loading spinner
        imageGenerated.style.display = "none"; // Hide old image

        // Pollinations.AI API - Free AI Image Generation
        // Encode the prompt to make it URL-safe
        const encodedPrompt = encodeURIComponent(prompt);
        
        // Create the image URL with parameters:
        // - width=800, height=600: Image dimensions
        // - nologo=true: Remove watermark
        // - seed: Random number to generate different images each time
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

        // Pre-load the image before displaying it
        const img = new Image();
        
        // When image loads successfully
        img.onload = function() {
            // Hide spinner and show the generated image
            spinner.style.display = "none";
            imageContainerText.innerText = "✅ Below is your generated AI image:";
            imageGenerated.src = imageUrl;
            imageGenerated.style.display = "block";
            generateBtn.disabled = false; // Re-enable the button
        };

        // If image fails to load
        img.onerror = function() {
            throw new Error('Failed to load image');
        };

        // Start loading the image
        img.src = imageUrl;

    } catch (error) {
        // Handle any errors that occur
        console.error('Error:', error);
        spinner.style.display = "none";
        imageContainerText.innerText = "❌ Error: Could not generate image. Please try again with a different prompt.";
        imageGenerated.style.display = "none";
        generateBtn.disabled = false; // Re-enable the button
    }
}

/**
 * Event listener for form submission
 * Prevents default form behavior and generates image
 */
generateImageForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    
    const enteredText = formInput.value.trim(); // Get input value and remove whitespace
    
    if (enteredText !== "") {
        // If input is not empty, show container and generate image
        imageContainer.style.display = "block";
        fetchImages(enteredText);
    } else {
        // If input is empty, show error message
        imageContainer.style.display = "block";
        imageContainerText.innerText = "⚠️ Input field cannot be empty!";
        imageGenerated.style.display = "none";
    }
});

/**
 * Optional: Add enter key support for better user experience
 */
formInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        generateImageForm.dispatchEvent(new Event('submit'));
    }
});