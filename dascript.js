const BLUEPRINT_ID = 12024; // Deimos Blueprint
const REGION_ID = 10000002; // The Forge
const JITA_STATION_ID = 60003760; // Jita 4-4
const CC_ID = 334 // Construction Components

const PRICE_MAP = new Map();
const MATS_MAP = new Map();


function init()
{
    console.log("DOM ready");
}

async function load()
{
    const status = document.getElementById("status");
    const table = document.getElementById("table");
    const tbody = table.querySelector("tbody");
    const grandTotalEl = document.getElementById("grandTotal");

    const me = Number(document.getElementById("meInput").value);

    status.textContent = "Loading...";

    tbody.innerHTML = "";
    table.hidden = true;

    let grandTotal = 0;

    const materials = await getBPMaterials(BLUEPRINT_ID)

    // PARALLEL PRICE LOADING
    const pricePromises =
        materials.map(async material => {

            status.textContent =
                `Loading ${material.name}...`;

            const sellPrice =
                await getLowestJitaSell(
                    material.typeid
                );

            return {
                material,
                sellPrice
            };
        });

    const results =
        await Promise.all(pricePromises);

    for (const result of results) {

        const material =
            result.material;

        const sellPrice =
            result.sellPrice;

        // ME formula
        const meQty =
            calculateMEQuantity(
                material.quantity,
                me
            );

        const total =
            meQty * sellPrice;

        grandTotal += total;

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${material.name}</td>

            <td>
                ${material.quantity.toLocaleString()}
            </td>

            <td>
                ${meQty.toLocaleString()}
            </td>

            <td>
                ${formatISK(sellPrice)}
            </td>

            <td>
                ${formatISK(total)}
            </td>
        `;

        tbody.appendChild(row);
    }

    table.hidden = false;

    grandTotalEl.textContent =
        "Total Build Cost: " +
        formatISK(grandTotal);

    status.textContent = "Done.";
}

async function getBPMaterials(bpId) {
    const blueprintRes = await fetch(`https://www.fuzzwork.co.uk/blueprint/api/blueprint.php?typeid=${bpId}`);
    const blueprintData = await blueprintRes.json();

    return blueprintData.activityMaterials["1"];
}

async function getCost(typeId)
{
    
}
async function getLowestJitaSell(typeId)
{
    let page = 1;
    let lowest = Infinity;

    while (true)
    {
        const url =
            `https://esi.evetech.net/latest/markets/${REGION_ID}/orders/` +
            `?datasource=tranquility` +
            `&order_type=sell` +
            `&type_id=${typeId}` +
            `&page=${page}`;

        const response = await fetch(url);
        const orders = await response.json();

        if (!orders.length) break;

        for (const order of orders)
        {
            // Jita 4-4 only
            if (order.location_id === JITA_STATION_ID && order.price < lowest) lowest = order.price;
        }
        if (orders.length < 1000) break; // stop request loop if last page

        page++;
    }

    if (lowest === Infinity) return 0;

    return lowest;
}

// Industry ME calculation
function calculateMEQuantity(baseQty, mePercent) {

    const wasteMultiplier =
        1 - (mePercent / 100);

    return Math.max(
        1,
        Math.ceil(baseQty * wasteMultiplier)
    );
}

function formatISK(value)
{
    return value.toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ) + " ISK";
}


document.addEventListener("DOMContentLoaded", init); // onload