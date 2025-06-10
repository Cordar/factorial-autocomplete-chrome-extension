// Remove any existing event listeners and add a new one
const button = document.getElementById("button-fill-time");
button.addEventListener("click", fillTime);

// Add loading state management
function setLoading(isLoading) {
    const button = document.getElementById("button-fill-time");
    const loadingText = "Loading...";
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText;
    }
}

// Add progress indicator
function showProgress(message) {
    const progressDiv = document.getElementById('progress-status');
    if (progressDiv) {
        progressDiv.textContent = message;
    }
}

// Function to generate random time within constraints
function generateRandomTimes(baseClockIn, baseClockOut, plannedHours) {
    // Parse base times
    const [baseInHour, baseInMin] = baseClockIn.split(':').map(Number);
    const [baseOutHour, baseOutMin] = baseClockOut.split(':').map(Number);
    
    // Convert to minutes for easier calculation
    const baseInMinutes = baseInHour * 60 + baseInMin;
    const baseOutMinutes = baseOutHour * 60 + baseOutMin;
    
    // Calculate base work duration
    const baseWorkDuration = baseOutMinutes - baseInMinutes;
    
    // Generate random deviation for clock in (-5 to +5 minutes)
    const clockInDeviation = Math.floor(Math.random() * 11) - 5;
    
    // Calculate new clock in time
    const newClockInMinutes = baseInMinutes + clockInDeviation;
    
    // Convert planned hours to minutes
    const plannedMinutes = Math.round(plannedHours * 60);
    
    // Ensure minimum planned hours of work time
    const minClockOutMinutes = newClockInMinutes + plannedMinutes;
    
    // Generate random deviation for clock out (0 to +2 minutes)
    const clockOutDeviation = Math.floor(Math.random() * 3);
    
    // Calculate new clock out time, ensuring it's at least planned hours after clock in
    // Add 3 minutes to ensure we always meet the minimum hours
    const newClockOutMinutes = Math.max(minClockOutMinutes + 3, baseOutMinutes + clockOutDeviation);
    
    // Convert back to HH:MM format
    function formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    
    return {
        clockIn: formatTime(newClockInMinutes),
        clockOut: formatTime(newClockOutMinutes)
    };
}

// Function to get cookies from browser
function getCookies() {
    return document.cookie;
}

// Function to get request headers
function getRequestHeaders() {
    return {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'ca,es;q=0.9,en;q=0.8,de;q=0.7',
        'cookie': document.cookie,
        'dnt': '1',
        'origin': 'https://app.factorialhr.com',
        'referer': 'https://app.factorialhr.com/',
        'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'x-deployment-phase': 'default',
        'x-factorial-access': '2228783',
        'x-factorial-origin': 'web',
        'x-factorial-version': 'fb8cebd66ad5ee23500af66255a2bc82d7e33125'
    };
}

// Function to get planned hours for the entire month
async function getMonthCalendar(year, month, employee_id) {
    try {
        // Get the first and last day of the month
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        
        // Format dates as YYYY-MM-DD
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
        
        const response = await fetch(`https://api.factorialhr.com/attendance/calendar?start_on=${startDate}&end_on=${endDate}&id=${employee_id}`, {
            method: 'GET',
            redirect: 'follow',
            headers: getRequestHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`Failed to fetch calendar data: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching calendar data:', error);
        throw error;
    }
}

// Function to get planned hours for a specific day from calendar data
function getPlannedHoursForDay(calendarData, year, month, day) {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayData = calendarData.find(d => d.date === dateStr);
    
    if (!dayData) {
        return 8; // Default to 8 hours if no data found
    }
    
    if (!dayData.is_laborable) {
        return 0;
    }
    
    if (dayData.is_leave) {
        return dayData.leaves[0]?.hours_amount || 0;
    }
    
    return 8; // Default to 8 hours if no specific hours found
}

// Function to delete existing shifts
async function deleteExistingShifts(year, month, employee_id) {
    showProgress('Checking for existing shifts...');
    
    try {
        // Get all shifts for the month
        const response = await fetch(`https://api.factorialhr.com/attendance/shifts?year=${year}&month=${month}&employee_id=${employee_id}`, {
            method: 'GET',
            redirect: 'follow',
            headers: getRequestHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`Failed to fetch existing shifts: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
        }
        
        const shifts = await response.json();
        
        if (!shifts || shifts.length === 0) {
            showProgress('No existing shifts found');
            return;
        }
        
        showProgress(`Found ${shifts.length} existing shifts.\nStarting deletion...`);
        
        // Delete each shift
        for (let i = 0; i < shifts.length; i++) {
            const shift = shifts[i];
            showProgress(`Deleting shift ${i + 1}/${shifts.length}...`);
            
            const deleteResponse = await fetch(`https://api.factorialhr.com/attendance/shifts/${shift.id}`, {
                method: 'DELETE',
                redirect: 'follow',
                headers: getRequestHeaders()
            });
            
            if (!deleteResponse.ok) {
                const errorData = await deleteResponse.json().catch(() => null);
                throw new Error(`Failed to delete shift ${shift.id}: ${deleteResponse.status} ${deleteResponse.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
            }
        }
        
        showProgress(`Successfully deleted ${shifts.length} existing shifts`);
    } catch (error) {
        console.error('Error deleting shifts:', error);
        throw error;
    }
}

// Function to get current employee ID from GraphQL
async function getCurrentEmployeeId() {
    try {
        // Get current date in YYYY-MM-DD format
        const today = new Date();
        const currentDate = today.toISOString().split('T')[0];

        const response = await fetch("https://api.factorialhr.com/graphql?GetCurrent", {
            method: 'POST',
            headers: {
                ...getRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                operationName: "GetCurrent",
                variables: {
                    contractVersionsActiveOn: currentDate
                },
                query: `query GetCurrent($contractVersionsActiveOn: ISO8601Date!) {
                    apiCore {
                        currentsConnection {
                            edges {
                                node {
                                    employee {
                                        id
                                        contractversionsConnection(activeOn: $contractVersionsActiveOn) {
                                            edges {
                                                node {
                                                    id
                                                    startsOn
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }`
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`Failed to fetch employee ID: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
        }

        const data = await response.json();
        const employeeId = data?.data?.apiCore?.currentsConnection?.edges?.[0]?.node?.employee?.id;
        
        if (!employeeId) {
            console.error('Full response:', data);
            throw new Error('No employee ID found in response');
        }

        return employeeId;
    } catch (error) {
        console.error('Error fetching employee ID:', error);
        throw error;
    }
}

async function fillTime() {
    try {
        setLoading(true);
        showProgress('Starting time fill process...');

        // Get form values
        const year = document.getElementById('input-year').value;
        const month = document.getElementById('input-month').value;
        const baseClockIn = document.getElementById('input-clock-in').value;
        const baseClockOut = document.getElementById('input-clock-out').value;
        const removePrevious = document.getElementById('removePrevious')?.checked || false;

        // Get employee ID
        const employee_id = await getCurrentEmployeeId();
        showProgress('Employee ID retrieved successfully');

        // Get period ID
        const periodId = await getPeriodId(year, month, employee_id);
        showProgress('Period ID retrieved successfully');

        // Get calendar data for planned hours
        const calendarData = await getMonthCalendar(year, month, employee_id);
        showProgress('Calendar data retrieved successfully');

        // Delete existing shifts only if checkbox is checked
        if (removePrevious) {
            await deleteExistingShifts(year, month, employee_id);
        }

        // Fill the month with new shifts
        await fillMonth(year, month, baseClockIn, baseClockOut, periodId, calendarData);
        
    } catch (error) {
        console.error('Error in fillTime:', error);
        showProgress(`Error: ${error.message}`);
        setLoading(false); // Enable button if there's an error
    }
}

async function getPeriodId(year, month, employee_id) {
    showProgress('Fetching period information...');
    
    try {
        const response = await fetch(`https://api.factorialhr.com/attendance/periods?year=${year}&month=${month}&employee_id=${employee_id}`, {
            method: 'GET',
            redirect: 'follow',
            headers: getRequestHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`Failed to fetch period: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
        }

        const result = await response.json();
        if (!result || result.length === 0) {
            throw new Error('No period found for the specified month and year');
        }

        return result[0]["id"];
    } catch (error) {
        console.error('Error:', error);
        showProgress('Error: ' + error.message);
        setLoading(false);
        throw error;
    }
}

// Get weekdays for month and year
function getWeekdaysForMonthAndYear(month, year) {
    var weekdays = [];
    var firstDay = new Date(year, month - 1, 1);
    var lastDay = new Date(year, month, 0);
    var date = firstDay;
    while (date <= lastDay) {
        if (date.getDay() != 0 && date.getDay() != 6) {
            weekdays.push(date.getDate());
        }
        date.setDate(date.getDate() + 1);
    }
    return weekdays;
}

async function makeRequest(day, month, year, baseClockIn, baseClockOut, periodId, calendarData) {
    try {
        // Get planned hours for this day from calendar data
        const plannedHours = getPlannedHoursForDay(calendarData, year, month, day);
        
        // Skip if planned hours is 0
        if (plannedHours === 0) {
            console.log(`Skipping day ${day}: No planned hours`);
            return { day, success: true, skipped: true };
        }

        // Calculate morning shift (before lunch)
        const morningEnd = "13:30";
        // Subtract 1 hour from total planned hours to account for lunch break
        const adjustedPlannedHours = plannedHours - 1;
        const { clockIn: morningClockIn, clockOut: morningClockOut } = generateRandomTimes(baseClockIn, morningEnd, adjustedPlannedHours / 2);
        
        // Calculate afternoon shift (after lunch)
        const afternoonStart = "14:30";
        const { clockIn: afternoonClockIn, clockOut: afternoonClockOut } = generateRandomTimes(afternoonStart, baseClockOut, adjustedPlannedHours / 2);

        // Create morning shift
        const morningFormData = new FormData();
        morningFormData.append("clock_in", morningClockIn);
        morningFormData.append("clock_out", morningClockOut);
        morningFormData.append("date", year + "-" + month + "-" + day);
        morningFormData.append("day", day);
        morningFormData.append("period_id", periodId);
        
        const morningResponse = await fetch("https://api.factorialhr.com/attendance/shifts", {
            method: 'POST',
            body: morningFormData,
            redirect: 'follow',
            headers: getRequestHeaders()
        });
        
        if (!morningResponse.ok) {
            const errorData = await morningResponse.json().catch(() => null);
            throw new Error(`Failed to create morning shift for day ${day}: ${morningResponse.status} ${morningResponse.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
        }

        // Create afternoon shift
        const afternoonFormData = new FormData();
        afternoonFormData.append("clock_in", afternoonClockIn);
        afternoonFormData.append("clock_out", afternoonClockOut);
        afternoonFormData.append("date", year + "-" + month + "-" + day);
        afternoonFormData.append("day", day);
        afternoonFormData.append("period_id", periodId);
        
        const afternoonResponse = await fetch("https://api.factorialhr.com/attendance/shifts", {
            method: 'POST',
            body: afternoonFormData,
            redirect: 'follow',
            headers: getRequestHeaders()
        });
        
        if (!afternoonResponse.ok) {
            const errorData = await afternoonResponse.json().catch(() => null);
            throw new Error(`Failed to create afternoon shift for day ${day}: ${afternoonResponse.status} ${afternoonResponse.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
        }
        
        console.log(`Success for day ${day}: Morning ${morningClockIn}-${morningClockOut}, Afternoon ${afternoonClockIn}-${afternoonClockOut} (Planned: ${plannedHours}h)`);
        return { day, success: true, skipped: false };
    } catch (error) {
        console.error(`Error for day ${day}:`, error);
        return { day, success: false, error: error.message };
    }
}

async function fillMonth(year, month, baseClockIn, baseClockOut, periodId, calendarData) {
    const weekdays = getWeekdaysForMonthAndYear(month, year);
    let completedDays = 0;
    let skippedDays = [];
    let failedDays = [];
    
    showProgress(`Starting to fill ${weekdays.length} days...`);
    
    // Process days sequentially
    for (let i = 0; i < weekdays.length; i++) {
        const day = weekdays[i];
        showProgress(`Processing day ${day} (${i + 1}/${weekdays.length})...`);
        
        const result = await makeRequest(day, month, year, baseClockIn, baseClockOut, periodId, calendarData);
        if (result.success) {
            if (result.skipped) {
                skippedDays.push(day);
            } else {
                completedDays++;
            }
        } else {
            failedDays.push(day);
        }
    }

    // Show summary of results
    let summaryMessage = `Summary:\n`;
    summaryMessage += `Completed: ${completedDays} days\n`;
    if (skippedDays.length > 0) {
        summaryMessage += `Skipped: ${skippedDays.join(', ')}\n`;
    }
    if (failedDays.length > 0) {
        summaryMessage += `Failed: ${failedDays.join(', ')}`;
    }
    showProgress(summaryMessage);
    setLoading(false); // Enable button only after all operations are complete
}


    