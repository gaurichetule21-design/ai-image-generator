const generateImageForm = document.getElementById('generate-image-form');
const formInput = document.getElementById('input-value');
const imageContainerText = document.getElementById('imageContainerText');
const imageGenerated = document.getElementById('generated-image');
const imageContainer = document.getElementById('images-visible');
const spinner = document.getElementById('spinner');
const generateBtn = document.getElementById('generateBtn');

async function fetchImages(prompt) {
    try {
        generateBtn.disabled = true; 
        imageContainerText.innerText = "🎨 Generating your AI image, please wait...";
        spinner.style.display = "block"; 
        imageGenerated.style.display = "none"; 

        const encodedPrompt = encodeURIComponent(prompt);
        
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

        const img = new Image();
    
        img.onload = function() {
            spinner.style.display = "none";
            imageContainerText.innerText = "✅ Below is your generated AI image:";
            imageGenerated.src = imageUrl;
            imageGenerated.style.display = "block";
            generateBtn.disabled = false; 
        };

        img.onerror = function() {
            throw new Error('Failed to load image');
        };

        img.src = imageUrl;

    } catch (error) {
        console.error('Error:', error);
        spinner.style.display = "none";
        imageContainerText.innerText = "❌ Error: Could not generate image. Please try again with a different prompt.";
        imageGenerated.style.display = "none";
        generateBtn.disabled = false; 
    }
}

generateImageForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    
    const enteredText = formInput.value.trim(); 
    
    if (enteredText !== "") {
        imageContainer.style.display = "block";
        fetchImages(enteredText);
    } else {
        imageContainer.style.display = "block";
        imageContainerText.innerText = "⚠️ Input field cannot be empty!";
        imageGenerated.style.display = "none";
    }
});

formInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        generateImageForm.dispatchEvent(new Event('submit'));
    }
});