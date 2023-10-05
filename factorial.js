document.getElementById("button-fill-time").addEventListener("click", fillTime);

function fillTime()
{
    const year = document.getElementById("input-year").value;
    const month = document.getElementById("input-month").value;
    const employee_id = document.getElementById("input-employee-id").value;
    if (employee_id == "") {
        alert("Please enter an employee id, you can find it on your profile page");
    }
    getPeriodId(year, month, employee_id);
}

function getPeriodId(year, month, employee_id) {
    var requestOptions = {
        method: 'GET',
        redirect: 'follow',
      };

    const clock_in = document.getElementById("input-clock-in").value;
    const clock_out = document.getElementById("input-clock-out").value;

    let periodId;


    fetch("https://api.factorialhr.com/attendance/periods?year=" + year + "&month=" + month + "&employee_id=" + employee_id, requestOptions)
      .then(response => {console.log(response); return response.json()})
      .then(result => {
        console.log(result);
        periodId = result[0]["id"]
        fillMonth(
            year,
            month,
            clock_in,
            clock_out,
            periodId
        )
      })
      .catch(error => console.log('error', error));


    return periodId;
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

function makeRequest(day, month, year, clock_in, clock_out, periodId) {
    var formdata = new FormData();
    formdata.append("clock_in", clock_in);
    formdata.append("clock_out", clock_out);
    formdata.append("date", year + "-" + month + "-" + day);
    formdata.append("day", day);
    formdata.append("period_id", periodId   );
    
    var requestOptions = {
      method: 'POST',
      body: formdata,
      redirect: 'follow',
    };
    
    fetch("https://api.factorialhr.com/attendance/shifts", requestOptions)
      .then(response => response.text())
      .then(result => console.log(result))
      .catch(error => console.log('error', error));
}


function fillMonth(year, month, clock_in, clock_out, periodId) {
    weekdays = getWeekdaysForMonthAndYear(month, year)
    weekdays.forEach(day => {
        makeRequest(day, month, year, clock_in, clock_out, periodId)
    });
}


    