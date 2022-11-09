const API_KEY = "4efbd4797f2d5c095951f8efc8a1ba9d";
const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
let selectedCityText;
let selectedCity;
const getCity = async (searchText) => {
    const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`);
    return response.json();
}
const getCurrentWeatherData = async ({ lat, lon, name: city }) => {
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    const response = await fetch(url);
    return response.json();
}
const createurl = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`
const temperature = (temp) => `${temp?.toFixed(1)}°`
const setCurrentData = ({ name, main: { temp_max, temp_min, temp }, weather: [{ description }] }) => {
    const currentForecast = document.querySelector("#current-forecast");
    currentForecast.querySelector(".city").textContent = name;
    currentForecast.querySelector(".temp").textContent = temperature(temp);
    currentForecast.querySelector(".description").textContent = description;
    currentForecast.querySelector(".min-max-temp").textContent = `H:${temperature(temp_max)} L:${temperature(temp_min)} `;
}

const getHourlyData = async ({ name: city }) => {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    return data.list.map(forecast => {
        const { main: { temp, temp_min, temp_max }, dt, dt_txt, weather: [{ description, icon }] } = forecast;
        return { temp, temp_min, temp_max, dt, dt_txt, description, icon };
    })
}

const setHourlyData = ({ main: { temp: tempnow }, weather: [{ icon: iconnow }] }, hourlyForecast) => {
    console.log(hourlyForecast);
    const timeFormatter = Intl.DateTimeFormat("en", {
        hour24: true,
        hour: "numeric"
    })
    let data = hourlyForecast.slice(2, 14);
    const hourlyContainer = document.querySelector(".hourly-container");
    let innerHTMLString = `<article>
    <h3 class="time">Now</h3>
    <img class="icon" src="${createurl(iconnow)}"/>
    <p class="hourly-temp" >${temperature(tempnow)}</p>
</article>`;
    for (let { temp, icon, dt_txt } of data) {
        innerHTMLString += `<article>
    <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
    <img class="icon" src="${createurl(icon)}"/>
    <p class="hourly-temp" >${temperature(temp)}</p>
</article>`
    }
    hourlyContainer.innerHTML = innerHTMLString;
}
const setFeelsLike = ({ main: { feels_like } }) => {
    let container = document.querySelector("#feels-like");
    container.querySelector(".feels-like-temp").textContent = temperature(feels_like);
}
const setHumidity = ({ main: { humidity } }) => {
    let container = document.querySelector("#humidity");
    container.querySelector(".humid").textContent = `${humidity}%`;
}

const calculateDayWise = (hourlyForecast) => {
    let dayWiseForecast = new Map();
    for (let forecast of hourlyForecast) {
        const [date] = forecast.dt_txt.split(" ");
        const day = DAYS_OF_WEEK[new Date(date).getDay()];
        console.log(day);
        if (dayWiseForecast.has(day)) {
            let forecastOfDay = dayWiseForecast.get(day);
            forecastOfDay.push(forecast);
            dayWiseForecast.set(day, forecastOfDay);
        }
        else {
            dayWiseForecast.set(day, [forecast]);
        }

    }
    console.log(dayWiseForecast);
    for (let [key, value] of dayWiseForecast) {
        let min_temp = Math.min(...Array.from(value, val => val.temp_min));
        let max_temp = Math.max(...Array.from(value, val => val.temp_max));
        let icon = value.find(val => val.icon).icon;
        dayWiseForecast.set(key, { min_temp, max_temp, icon })

    }
    console.log(dayWiseForecast);
    return dayWiseForecast;
}


const setFiveDayForecast = (hourlyForecast) => {
    const dailyForecast = calculateDayWise(hourlyForecast);
    const container = document.querySelector(".five-day-forecast-container");
    let dataInfo = '';
    Array.from(dailyForecast).map(([key, { min_temp, max_temp, icon }], index) => {
        if (index < 5) {
            dataInfo += `<article class="day-wise-forecast">
                <h3 class="day">${index === 0 ? "Today" : key}</h3>
                <img class="icon" src="${createurl(icon)}" alt=""/>
                <p class="min-temp">${temperature(min_temp)}</p>
                <p class="max-temp">${temperature(max_temp)}</p>
            </article>`
        }

    })
    container.innerHTML = dataInfo;

}

function debounce(func) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args)
        }, 2000)
    }
}

const loadForecastUsingGeoLocation = () => {
    navigator.geolocation.getCurrentPosition(({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        selectedCity = { lat, lon };
        loadData();
    }, error => console.log(error))
}

const time=(t)=>{
    return new Date(t*1000).toLocaleTimeString();
}
const setSunrise=({sys:{sunrise}})=>{
let rise=document.querySelector("#sunrise");
rise.querySelector(".sunrise-time").textContent=time(sunrise);
}
const setSunset=({sys:{sunset}})=>{
    let rise=document.querySelector("#sunset");
    rise.querySelector(".sunset-time").textContent=time(sunset);
    }




const loadData = async () => {
    const getCurrentData = await getCurrentWeatherData(selectedCity);
    console.log(getCurrentData)
    setCurrentData(getCurrentData);
    const hourlyForecast = await getHourlyData(getCurrentData);
    setHourlyData(getCurrentData, hourlyForecast);
    setFeelsLike(getCurrentData);
    setHumidity(getCurrentData);
    setFiveDayForecast(hourlyForecast);
    setSunrise(getCurrentData);
    setSunset(getCurrentData);
}
const onsearch = async (event) => {
    let { value } = event.target;
    if (!value) {
        selectedCity = null;
        selectedCityText = "";
    }
    if (value && selectedCityText != value) {
        const listOfCities = await getCity(value);
        let options = ""
        for (let { lat, lon, name, state, country } of listOfCities) {
            options += `<option data-city-details='${JSON.stringify({ lat, lon, name })}' value="${name},${state},${country}" ></option>`
        }
        document.querySelector("#cities").innerHTML = options;
    }

}

const selectionCity = (event) => {
    selectedCityText = event.target.value;
    let options = document.querySelectorAll("#cities > option");
    if (options?.length) {
        let selectedOption = Array.from(options).find(opt => opt.value === selectedCityText);
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
        console.log(selectedCity)
        loadData();

    }
}
const debounceSearch = debounce((event) => onsearch(event));
document.addEventListener("DOMContentLoaded", async () => {
    loadForecastUsingGeoLocation();
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input", debounceSearch);
    searchInput.addEventListener("change", selectionCity)

})
