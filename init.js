// Function to initialize form with current date
function initializeForm() {
    console.log("Initializing form");
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, so we add 1
    console.log("Current year: " + currentYear);
    console.log("Current month: " + currentMonth);

    // Format month to always be 2 digits
    const formattedMonth = currentMonth.toString().padStart(2, '0');
    console.log("Formatted month: " + formattedMonth);
    // Set the year and month values in the form
    const yearInput = document.getElementById('input-year');
    const monthInput = document.getElementById('input-month');
    console.log("Year input: " + yearInput);
    console.log("Month input: " + monthInput);
    
    if (yearInput) {
        yearInput.value = currentYear;
    }
    if (monthInput) {
        monthInput.value = formattedMonth;
    }
    
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, add event listener
    console.log("DOM is still loading");
    document.addEventListener('DOMContentLoaded', initializeForm);
} else {
    // DOM is already loaded, execute immediately
    console.log("DOM is already loaded");
    initializeForm();
}