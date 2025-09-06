// ---------------------------------------------------------------------------------------------
// 1. Date and Time Display
// ---------------------------------------------------------------------------------------------


// ------ Updates the date and time displayed on the page every second.
function updateDateTime() {
    const now = new Date();

    // Extract parts of the date and time
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    const dateFormatted = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const currentTime = now.toLocaleTimeString('en-US');

    // Update HTML elements
    document.getElementById('day-name').textContent = dayName;
    document.getElementById('month-name').textContent = monthName;
    document.getElementById('date-formatted').textContent = dateFormatted;
    document.getElementById('current-time').textContent = currentTime;
}
setInterval(updateDateTime, 1000);

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Function to open the calendar modal
function openCalendarModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Month and Year Navigation
    const navigationContainer = document.createElement('div');
    navigationContainer.className = 'calendar-navigation';

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.className = 'nav-btn';
    prevButton.onclick = () => updateCalendar(-1);

    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.className = 'nav-btn';
    nextButton.onclick = () => updateCalendar(1);

    const monthYearDisplay = document.createElement('span');
    monthYearDisplay.className = 'month-year-display';
    monthYearDisplay.textContent = `${getMonthName(currentMonth)} ${currentYear}`;

    navigationContainer.appendChild(prevButton);
    navigationContainer.appendChild(monthYearDisplay);
    navigationContainer.appendChild(nextButton);
    modalContent.appendChild(navigationContainer);

    // Calendar container
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar';
    calendarContainer.innerHTML = generateCalendar(currentMonth, currentYear);
    modalContent.appendChild(calendarContainer);

    // Return to Current Month Button
    const returnButton = document.createElement('button');
    returnButton.textContent = 'Return to Current Month';
    returnButton.className = 'modal-action-btn return-btn';
    returnButton.onclick = () => {
        const today = new Date();
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        monthYearDisplay.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
        calendarContainer.innerHTML = generateCalendar(currentMonth, currentYear);
    };
    modalContent.appendChild(returnButton);


    // Close Button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'modal-action-btn';
    closeButton.onclick = () => modal.remove();
    modalContent.appendChild(closeButton);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Helper function to update the calendar
    function updateCalendar(change) {
        currentMonth += change;

        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear -= 1;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear += 1;
        }

        monthYearDisplay.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
        calendarContainer.innerHTML = generateCalendar(currentMonth, currentYear);
    }
}

// Function to generate calendar HTML for a given month and year
function generateCalendar(month, year) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const today = new Date();

    // Add days of the week headers
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let calendarHTML = '<div class="calendar-grid">';
    calendarHTML += daysOfWeek.map(day => `<div class="calendar-header">${day}</div>`).join('');

    // Empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayIndex; i++) {
        calendarHTML += '<div class="calendar-cell empty"></div>';
    }

    // Add day numbers
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday =
            today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year;

        calendarHTML += `<div class="calendar-cell ${isToday ? 'current-day' : ''}">${day}</div>`;
    }

    calendarHTML += '</div>';
    return calendarHTML;
}

// Function to get the full name of a month
function getMonthName(month) {
    return new Date(2000, month).toLocaleString('en-US', { month: 'long' });
}


// ---------------------------------------------------------------------------------------------
// 2. Stopwatch Functionality
// ---------------------------------------------------------------------------------------------


// ------ Stores interval IDs for each stopwatch
let stopwatchIntervals = {};


// ------ Starts the stopwatch for a given ID.
function startStopwatch(stopwatchId) {
    if (stopwatchIntervals[stopwatchId]) return;

    const display = document.getElementById(`${stopwatchId}-display`);
    let time = 0;

    stopwatchIntervals[stopwatchId] = setInterval(() => {
        time += 1;
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;
        display.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}


// ------ Stops the stopwatch for a given ID.
function stopStopwatch(stopwatchId) {
    clearInterval(stopwatchIntervals[stopwatchId]);
    stopwatchIntervals[stopwatchId] = null;
}


// ------ Resets the stopwatch to 00:00:00.
function resetStopwatch(stopwatchId) {
    clearInterval(stopwatchIntervals[stopwatchId]);
    stopwatchIntervals[stopwatchId] = null;
    document.getElementById(`${stopwatchId}-display`).textContent = "00:00:00";
}


// ------ Restarts the stopwatch from 00:00:00.
function restartStopwatch(stopwatchId) {
    resetStopwatch(stopwatchId);
    startStopwatch(stopwatchId);
}


// ---------------------------------------------------------------------------------------------
// 3. Timer Input Handling
// ---------------------------------------------------------------------------------------------


// ------ Formats a numeric input as HH:MM:SS.
function formatTimeInput(value) {
    const digits = value.replace(/\D/g, ''); // Remove non-digit characters
    const totalDigits = digits.length;

    if (totalDigits === 0) return ""; // Empty input

    // Parse digits into hours, minutes, and seconds
    let seconds = 0, minutes = 0, hours = 0;

    if (totalDigits <= 2) {
        seconds = parseInt(digits, 10); // Only seconds
        return `${seconds}`;
    } else if (totalDigits <= 4) {
        seconds = parseInt(digits.slice(-2), 10); // Last two digits are seconds
        minutes = parseInt(digits.slice(0, -2), 10); // Remaining digits are minutes
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        seconds = parseInt(digits.slice(-2), 10); // Last two digits are seconds
        minutes = parseInt(digits.slice(-4, -2), 10); // Next two digits are minutes
        hours = parseInt(digits.slice(0, -4), 10); // Remaining digits are hours
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}


// ------ Add a digit to the timer input and format it
function appendDigit(digit) {
    const timerInput = document.getElementById("timer-input");
    const currentValue = timerInput.value.replace(/:/g, ""); // Remove colons for raw digit manipulation
    const newValue = currentValue + digit;

    if (newValue.length <= 6) { // Limit to 6 digits
        timerInput.value = formatTimeInput(newValue);
    }
}

// Append "00" to the timer input
function appendDoubleZero() {
    const timerInput = document.getElementById("timer-input");
    if (timerInput.value.length < 6) { // Prevent exceeding max digits
        timerInput.value += "00";
        timerInput.value = formatTimeInput(timerInput.value); // Reformat the input
    }
}

// ------ Clear the timer input field
function clearTimerInput() {
    const timerInput = document.getElementById("timer-input");
    timerInput.value = "";
}


// ------ Remove the last digit from the timer input field
function backspaceTimerInput() {
    const timerInput = document.getElementById("timer-input");
    const currentValue = timerInput.value.replace(/:/g, ""); // Remove colons
    const newValue = currentValue.slice(0, -1); // Remove the last digit
    timerInput.value = formatTimeInput(newValue);
}

// ------ Helper function to parse the formatted input into total seconds
function parseTimeInput(value) {
    const digits = value.replace(/:/g, ""); // Remove colons to get raw digits
    const totalDigits = digits.length;

    if (totalDigits === 0) return 0; // No input, return 0 seconds

    let seconds = 0, minutes = 0, hours = 0;

    if (totalDigits <= 2) {
        seconds = parseInt(digits, 10); // Only seconds
    } else if (totalDigits <= 4) {
        seconds = parseInt(digits.slice(-2), 10); // Last two digits are seconds
        minutes = parseInt(digits.slice(0, -2), 10); // Remaining digits are minutes
    } else {
        seconds = parseInt(digits.slice(-2), 10); // Last two digits are seconds
        minutes = parseInt(digits.slice(-4, -2), 10); // Next two digits are minutes
        hours = parseInt(digits.slice(0, -4), 10); // Remaining digits are hours
    }

    // Convert everything to seconds
    return hours * 3600 + minutes * 60 + seconds;
}

// Helper function to format total seconds into HH:MM:SS
function formatDurationFromSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${seconds}`;
    }
}


// ---------------------------------------------------------------------------------------------
// 4. Timer Creation and Management
// ---------------------------------------------------------------------------------------------


// ------ Starts a timer with the provided input.
function startTimer() {
    const timeInput = document.getElementById("timer-input").value;
    const totalSeconds = parseTimeInput(timeInput);

    if (totalSeconds > 0) {
        const formattedTitle = formatDurationFromSeconds(totalSeconds); // Format title correctly
        const timerName = document.getElementById("timer-name").value || formattedTitle;
        const endTime = new Date(Date.now() + totalSeconds * 1000);

        createCustomTimerCard(timerName, endTime, totalSeconds);
        resetTimerFields(); // Reset fields after starting the timer
    }
}


// ------ Resets the timer creation fields.
function resetTimerFields() {
    document.getElementById("timer-name").value = "";
    document.getElementById("timer-input").value = "";
}


// ------ Adds a timer button with a delete option.
function addTimer() {
    const timeInput = document.getElementById("timer-input").value;
    const totalSeconds = parseTimeInput(timeInput);
    const formattedTitle = formatDurationFromSeconds(totalSeconds); // Format title correctly
    const timerName = document.getElementById("timer-name").value || formattedTitle;

    if (totalSeconds > 0) {
        const timerButtonContainer = document.createElement("div");
        timerButtonContainer.className = "timer-button-container";

        const addButton = document.createElement("button");
        addButton.textContent = timerName; // Correctly formatted title
        addButton.classList.add("timer-btn");
        addButton.onclick = () => startTimerFromButton(totalSeconds, timerName);
        timerButtonContainer.appendChild(addButton);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "X";
        deleteButton.classList.add("delete-btn");
        deleteButton.onclick = () => timerButtonContainer.remove();
        timerButtonContainer.appendChild(deleteButton);

        document.getElementById("added-timers").appendChild(timerButtonContainer);
        resetTimerFields(); // Reset fields after adding a timer
    }
}

// ------ Starts a timer from a button click.
function startTimerFromButton(totalSeconds, timerName) {
    const endTime = new Date(Date.now() + totalSeconds * 1000);
    createCustomTimerCard(timerName, endTime, totalSeconds);
}


// ---------------------------------------------------------------------------------------------
// 5. Custom Timer Cards
// ---------------------------------------------------------------------------------------------


// ------ Creates a custom timer card with worded-out duration.
function createCustomTimerCard(title, targetTime, duration) {
    const timerCard = document.createElement('div');
    timerCard.className = 'timer-card custom-timer';

    // Add the target time as a data attribute
    timerCard.dataset.targetTime = targetTime.toISOString(); // Store as timestamp

    const titleElement = document.createElement('h3');
    titleElement.textContent = title; // Use formatted title
    timerCard.appendChild(titleElement);

    const targetInfo = document.createElement('p');
    const targetString = targetTime.toLocaleTimeString('en-US');
    const wordedDuration = formatDuration(duration); // Worded out duration
    targetInfo.textContent = `Target Time: ${wordedDuration} (${targetString})`;
    timerCard.appendChild(targetInfo);

    const countdownElement = document.createElement('p');
    countdownElement.className = 'countdown';
    timerCard.appendChild(countdownElement);

    let intervalId = startCountdown(targetTime, countdownElement);

    const timerActions = document.createElement('div');
    timerActions.className = 'timer-actions';

    // Edit Button
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.onclick = () => openEditModal(timerCard, duration, 'custom', (newDuration) => {
        clearInterval(intervalId);
        const newTargetTime = new Date(Date.now() + newDuration * 1000);
        intervalId = startCountdown(newTargetTime, countdownElement);
        targetInfo.textContent = `Target Time: ${formatDuration(newDuration)} (${newTargetTime.toLocaleTimeString('en-US')})`;

        // Update the target time in the data attribute
        timerCard.dataset.targetTime = newTargetTime.getTime();
    });
    timerActions.appendChild(editButton);

    // Clear Button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear';
    clearButton.onclick = () => {
        clearInterval(intervalId);
        timerCard.remove();
    };
    timerActions.appendChild(clearButton);

    timerCard.appendChild(timerActions);
    document.getElementById("active-timers").appendChild(timerCard);
}


// ------ Formats the duration into a readable string.
function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60); // Round seconds to the nearest whole number

    let result = '';
    if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''} `;
    if (minutes > 0) result += `${minutes} min${minutes > 1 ? 's' : ''} `;
    result += `${seconds} sec${seconds > 1 ? 's' : ''}`;
    return result;
}

// ------ Starts the countdown for a timer card.
function startCountdown(targetTime, countdownElement) {
    const timerCard = countdownElement.parentElement;

    return setInterval(() => {
        const now = new Date();
        const remainingTime = targetTime - now;

        if (remainingTime <= 0) {
            countdownElement.textContent = "Time's up!";
            timerCard.style.backgroundColor = "";
            clearInterval(this);
        } else {
            const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
            const seconds = Math.floor((remainingTime / 1000) % 60);
            countdownElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Change background color based on the remaining time
            if (remainingTime <= 10 * 1000) { // 10 seconds or less
                timerCard.style.backgroundColor = "#f2dede"; // Red
            } else if (remainingTime <= 15 * 1000) { // 15 seconds or less
                timerCard.style.backgroundColor = "#fcf8e3"; // Orange
            } else if (remainingTime <= 30 * 1000) {
                timerCard.style.backgroundColor = "#dff0d8"; // Green
            } else if (remainingTime <= 60 * 1000) {
                timerCard.style.backgroundColor = "#d9edf7"; // Blue
            } else {
                timerCard.style.backgroundColor = ""; // Default background
            }
        }
    }, 1000);
}


// ---------------------------------------------------------------------------------------------
// 6. Modals and Utilities
// ---------------------------------------------------------------------------------------------


// ------ Opens an edit modal for timers.
function openEditModal(timerCard, duration, type, onSave) {
    const modal = document.createElement('div');
    modal.className = 'modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const modalTitle = document.createElement('h3');
    modalTitle.textContent = type === 'custom' ? 'Edit Custom Timer' : 'Edit Preset Timer';
    modalContent.appendChild(modalTitle);

    if (type === 'custom') {
        // Title Label and Input
        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Timer Name:';
        titleLabel.className = 'modal-label';
        modalContent.appendChild(titleLabel);

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = timerCard.querySelector('h3').textContent;
        titleInput.placeholder = 'Enter Timer Name';
        titleInput.className = 'modal-input';
        modalContent.appendChild(titleInput);

        // Time Label and Input
        const timeLabel = document.createElement('label');
        timeLabel.textContent = 'Time:';
        timeLabel.className = 'modal-label';
        modalContent.appendChild(timeLabel);

        const timeInput = document.createElement('input');
        timeInput.type = 'text';
        timeInput.placeholder = 'Enter time (e.g., 125 for 1:25)';
        timeInput.className = 'modal-input';

        // Convert duration (seconds) back to its raw format
        const convertToRawInput = (seconds) => {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return `${hrs > 0 ? hrs : ''}${mins > 0 ? mins : '0'}${secs.toString().padStart(2, '0')}`;
        };

        timeInput.value = convertToRawInput(duration); // Use raw input format
        timeInput.addEventListener('input', () => {
            timeInput.value = formatTimeInput(timeInput.value); // Allow user to edit with formatting
        });
        modalContent.appendChild(timeInput);

        // Custom Modal Buttons (2x2 grid)
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons custom';

        const saveResumeButton = document.createElement('button');
        saveResumeButton.textContent = 'Save & Resume';
        saveResumeButton.className = 'modal-action-btn';
        saveResumeButton.onclick = () => {
            const newTitle = titleInput.value || formatDuration(duration);
            timerCard.querySelector('h3').textContent = newTitle;
            modal.remove();
        };
        buttonContainer.appendChild(saveResumeButton);

        const saveRestartButton = document.createElement('button');
        saveRestartButton.textContent = 'Save & Restart';
        saveRestartButton.className = 'modal-action-btn';
        saveRestartButton.onclick = () => {
            const newDuration = parseTimeInput(timeInput.value);
            const newTitle = titleInput.value || formatDuration(newDuration);
            onSave(newDuration, newTitle);
            modal.remove();
        };
        buttonContainer.appendChild(saveRestartButton);

        const startNewTimerButton = document.createElement('button');
        startNewTimerButton.textContent = 'Start New Timer';
        startNewTimerButton.className = 'modal-action-btn';
        startNewTimerButton.onclick = () => {
            const newDuration = parseTimeInput(timeInput.value);
            const newTitle = titleInput.value || formatDuration(newDuration);
            createCustomTimerCard(newTitle, new Date(Date.now() + newDuration * 1000), newDuration);
            modal.remove();
        };
        buttonContainer.appendChild(startNewTimerButton);

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'modal-action-btn';
        cancelButton.onclick = () => modal.remove();
        buttonContainer.appendChild(cancelButton);

        modalContent.appendChild(buttonContainer);

    } else if (type === 'preset') {
        const timeLabel = document.createElement('label');
        timeLabel.textContent = 'Time:';
        timeLabel.className = 'modal-label';
        modalContent.appendChild(timeLabel);

        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.value = new Date(Date.now() + duration * 1000)
            .toLocaleTimeString('en-US', { hour12: false });
        timeInput.className = 'modal-input';
        modalContent.appendChild(timeInput);

        // Preset Modal Buttons (1 row)
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons preset';

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'modal-action-btn';
        saveButton.onclick = () => {
            const [newHours, newMinutes, newSeconds] = timeInput.value.split(':').map(Number);
            const newTargetTime = new Date();
            newTargetTime.setHours(newHours, newMinutes, newSeconds || 0);

            if (newTargetTime < new Date()) {
                newTargetTime.setDate(newTargetTime.getDate() + 1);
            }

            const newDuration = Math.floor((newTargetTime - Date.now()) / 1000);
            onSave(newDuration, timerCard.querySelector('h3').textContent);
            modal.remove();
        };
        buttonContainer.appendChild(saveButton);

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'modal-action-btn';
        cancelButton.onclick = () => modal.remove();
        buttonContainer.appendChild(cancelButton);

        modalContent.appendChild(buttonContainer);
    }

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}


// ---------------------------------------------------------------------------------------------
// 7. Preset Timer Cards
// ---------------------------------------------------------------------------------------------


// ------ Function to start a timer with a preset label and target time
function startPresetTimer(label, time) {
    const [hours, minutes, seconds, period] = time.split(/[: ]/);
    let hour = parseInt(hours);
    const minute = parseInt(minutes);
    const second = parseInt(seconds);

    // Convert to 24-hour format if necessary
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    const now = new Date();
    const targetTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        second
    );

    if (targetTime < now) {
        targetTime.setDate(targetTime.getDate() + 1);
    }

    const remainingTimeInSeconds = Math.floor((targetTime - now) / 1000);

    // Create a new card for preset timers
    createPresetTimerCard(label, targetTime, remainingTimeInSeconds);
}


// ------ Creates a preset timer card.
function createPresetTimerCard(label, targetTime, duration) {
    const timerCard = document.createElement('div');
    timerCard.className = 'timer-card preset-timer';

    // Add the target time as a data attribute
    timerCard.dataset.targetTime = targetTime.toISOString(); // Store as timestamp

    const titleElement = document.createElement('h3');
    titleElement.textContent = label;
    titleElement.style.fontWeight = 'bold';
    timerCard.appendChild(titleElement);

    const targetInfo = document.createElement('p');
    targetInfo.textContent = `Target Time: ${targetTime.toLocaleTimeString('en-US')}`;
    timerCard.appendChild(targetInfo);

    const countdownElement = document.createElement('p');
    countdownElement.className = 'countdown';
    timerCard.appendChild(countdownElement);

    let intervalId = startCountdown(targetTime, countdownElement);

    const timerActions = document.createElement('div');
    timerActions.className = 'timer-actions';

    // Edit Button
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.onclick = () => openEditModal(timerCard, Math.floor((targetTime - new Date()) / 1000), 'preset', (newDuration) => {
        clearInterval(intervalId);
        const newTargetTime = new Date(Date.now() + newDuration * 1000);
        intervalId = startCountdown(newTargetTime, countdownElement);
        targetInfo.textContent = `Target Time: ${newTargetTime.toLocaleTimeString('en-US')}`;

        // Update the target time in the data attribute
        timerCard.dataset.targetTime = newTargetTime.getTime();
    });
    timerActions.appendChild(editButton);

    // Clear Button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear';
    clearButton.onclick = () => {
        clearInterval(intervalId);
        timerCard.remove();
    };
    timerActions.appendChild(clearButton);

    timerCard.appendChild(timerActions);
    document.getElementById("active-timers").appendChild(timerCard);
}

function togglePreset(sectionId) {
    const presetSection = document.getElementById(`${sectionId}-presets`);
    if (presetSection) {
        presetSection.style.display = 
            presetSection.style.display === 'none' ? 'flex' : 'none';
    }
}


// ---------------------------------------------------------------------------------------------
// 8. Time Between Modal
// ---------------------------------------------------------------------------------------------


function openTimeDifferenceModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Title
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Time Between Timers';
    modalContent.appendChild(modalTitle);

    // Dropdown for Timer 1
    const timer1Label = document.createElement('label');
    timer1Label.textContent = 'Select First Timer:';
    modalContent.appendChild(timer1Label);

    const timer1Select = document.createElement('select');
    timer1Select.className = 'modal-select';
    populateTimerDropdown(timer1Select);
    modalContent.appendChild(timer1Select);

    // Dropdown for Timer 2
    const timer2Label = document.createElement('label');
    timer2Label.textContent = 'Select Second Timer:';
    modalContent.appendChild(timer2Label);

    const timer2Select = document.createElement('select');
    timer2Select.className = 'modal-select';
    populateTimerDropdown(timer2Select);
    modalContent.appendChild(timer2Select);

    // Calculate Button
    const calculateButton = document.createElement('button');
    calculateButton.textContent = 'Calculate Difference';
    calculateButton.className = 'modal-action-btn';
    calculateButton.onclick = () => {
        const timer1Time = new Date(timer1Select.value);
        const timer2Time = new Date(timer2Select.value);

        if (isNaN(timer1Time) || isNaN(timer2Time)) {
            alert('Please select two valid timers.');
            return;
        }

        const timeDifference = Math.abs(timer2Time - timer1Time) / 1000; // Difference in seconds
        const formattedDifference = formatDuration(timeDifference);

        // Display result in the modal
        resultContainer.textContent = `Time Difference: ${formattedDifference}`;
    };
    modalContent.appendChild(calculateButton);

    // Result Container
    const resultContainer = document.createElement('p');
    resultContainer.className = 'modal-result';
    modalContent.appendChild(resultContainer);

    // Close Button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'modal-action-btn';
    closeButton.onclick = () => modal.remove();
    modalContent.appendChild(closeButton);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

function calculateTimeDifference(timer1, timer2) {
    const time1 = new Date(timer1.dataset.targetTime);
    const time2 = new Date(timer2.dataset.targetTime);

    if (isNaN(time1) || isNaN(time2)) {
        return 'Invalid timer data.';
    }

    const differenceInSeconds = Math.abs(time2 - time1) / 1000;

    const hours = Math.floor(differenceInSeconds / 3600);
    const minutes = Math.floor((differenceInSeconds % 3600) / 60);
    const seconds = Math.round(differenceInSeconds % 60);

    const formattedDifference = `${hours > 0 ? hours + ' hr ' : ''}${minutes > 0 ? minutes + ' min ' : ''}${seconds} sec`;
    return formattedDifference;
}

function populateTimerDropdown(selectElement) {
    const activeTimers = document.querySelectorAll('.timer-card');
    activeTimers.forEach((timerCard) => {
        const targetTimeAttr = timerCard.dataset.targetTime;
        const timerTitle = timerCard.querySelector('h3').textContent;

        if (targetTimeAttr) {
            const targetTime = new Date(targetTimeAttr); // Parse ISO string as Date
            if (!isNaN(targetTime)) { // Ensure valid date
                const option = document.createElement('option');
                option.value = targetTime.toISOString(); // Store ISO string as value
                option.textContent = `${timerTitle} (${targetTime.toLocaleTimeString('en-US')})`;
                selectElement.appendChild(option);
            }
        }
    });
}


// ---------------------------------------------------------------------------------------------
// 9. Initialization
// ---------------------------------------------------------------------------------------------


// ------ Initializes the date and time updates.
updateDateTime();