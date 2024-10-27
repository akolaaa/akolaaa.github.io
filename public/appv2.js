let cachedData = null;
let cachedConstants = null;

async function fetchData() {
    if (cachedData) return cachedData;
    try {
        const response = await fetch("data.json");
        const data = await response.json();
        cachedData = data;
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function fetchConstants() {
    if (cachedConstants) return cachedConstants;
    try {
        const response = await fetch("constants.json");
        const data = await response.json();
        cachedConstants = data;
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function populateDropdown(dropdownId, dataType) {
    const data = await fetchConstants();
    if (!data) return;
    const dropdown = document.getElementById(dropdownId);
    const fragment = document.createDocumentFragment();
    data.filter((item) => item.datatype === dataType).forEach((item) => {
        const option = document.createElement("option");
        option.text = item.name;
        option.value = item.name;
        fragment.appendChild(option);
    });
    dropdown.appendChild(fragment);
}

async function initialize() {
    await Promise.all([
        populateDropdown("potType", "pot"),
        populateDropdown("plantType", "species"),
        populateDropdown("season", "season"),
    ]);
}

function calculatePotVolume(diameter, height) {
    const radius = diameter / 2;
    return Math.PI * Math.pow(radius, 2) * height;
}

async function calculateRecommendations(potVolume, potType, plantType, season) {
    const data = await fetchConstants();
    if (!data) return;
    let potdata, speciesdata, seasondata;
    data.forEach((item) => {
        if (item.datatype === "pot" && item.name === potType) potdata = item;
        if (item.datatype === "species" && item.name === plantType)
            speciesdata = item;
        if (item.datatype === "season" && item.name === season)
            seasondata = item;
    });

    let water =
        potVolume * 0.0001 * potdata.datafield_1 * seasondata.datafield_1;
    let fertilizer = water * seasondata.datafield_2;
    document.getElementById("recommendedWater").textContent = `${water.toFixed(
        1
    )} liters`;
    document.getElementById(
        "recommendedFertilizer"
    ).textContent = `${fertilizer.toFixed(2)} units`;
}

async function findRecommendations(potVolume, potType, plantType, season) {
    const data = await fetchData();
    if (!data) return;

    const similarItems = data.filter(
        (item) =>
            item.pot_type === potType &&
            item.plant_type === plantType &&
            item.time_of_year === season &&
            item.pot_volume > potVolume * 0.9 &&
            item.pot_volume < potVolume * 1.1
    );

    document.getElementById("similar").textContent = similarItems.length;

    const filteredItems = (filterCondition) =>
        similarItems.filter(filterCondition);
    const aggregateData = (items) =>
        items.reduce(
            (acc, item) => {
                acc.sumGrowth += item.growth_rate;
                acc.sumYield += item.crop_yield;
                return acc;
            },
            { count: items.length, sumGrowth: 0, sumYield: 0 }
        );

    const setStats = (id, data) => {
        document.getElementById(`${id}Count`).textContent = data.count;
        document.getElementById(`${id}GrowthAverage`).textContent = data.count
            ? (data.sumGrowth / data.count).toFixed(1)
            : "-";
        document.getElementById(`${id}YieldAverage`).textContent = data.count
            ? (data.sumYield / data.count).toFixed(1)
            : "-";
    };

    const similarWaterItems = aggregateData(
        filteredItems(
            (item) =>
                item.actual_water > item.recommended_water * 0.9 &&
                item.actual_water < item.recommended_water * 1.1
        )
    );
    const lessWaterItems = aggregateData(
        filteredItems(
            (item) => item.actual_water <= item.recommended_water * 0.9
        )
    );
    const moreWaterItems = aggregateData(
        filteredItems(
            (item) => item.actual_water >= item.recommended_water * 1.1
        )
    );

    setStats("similarwater", similarWaterItems);
    setStats("lesswater", lessWaterItems);
    setStats("morewater", moreWaterItems);

    document.getElementById("outputSection").style.display = "block";
}

document
    .getElementById("calculateButton")
    .addEventListener("click", function () {
        const potType = document.getElementById("potType").value;
        const potDiameter = parseFloat(
            document.getElementById("potDiameter").value
        );
        const potHeight = parseFloat(
            document.getElementById("potHeight").value
        );
        const plantType = document.getElementById("plantType").value;
        const season = document.getElementById("season").value;

        const potVolume = calculatePotVolume(potDiameter, potHeight);
        document.getElementById("potSize").textContent = (
            potVolume / 1000
        ).toFixed(1);

        calculateRecommendations(potVolume, potType, plantType, season);
        findRecommendations(potVolume, potType, plantType, season);
    });

initialize();
