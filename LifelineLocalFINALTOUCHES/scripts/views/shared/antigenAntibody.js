/**
 * antigenAntibody.js
 * 
 * Provides reusable functions to create and manage a dynamic, medically-valid
 * UI for selecting antigens and antibodies. This component is used for both
 * patient and donor forms.
 */

const ANTIGEN_ANTIBODY_PAIRS = [
    { antigen: 'D', antibody: 'Anti-D' },
    { antigen: 'C', antibody: 'Anti-C' },
    { antigen: 'c', antibody: 'Anti-c' },
    { antigen: 'E', antibody: 'Anti-E' },
    { antigen: 'e', antibody: 'Anti-e' },
    { antigen: 'K', antibody: 'Anti-K' },
    { antigen: 'k', antibody: 'Anti-k' },
    { antigen: 'Fya', antibody: 'Anti-Fya' },
    { antigen: 'Fyb', antibody: 'Anti-Fyb' },
    { antigen: 'Jka', antibody: 'Anti-Jka' },
    { antigen: 'Jkb', antibody: 'Anti-Jkb' },
    { antigen: 'M', antibody: 'Anti-M' },
    { antigen: 'N', antibody: 'Anti-N' },
    { antigen: 'S', antibody: 'Anti-S' },
    { antigen: 's', antibody: 'Anti-s' },
];

/**
 * Creates the HTML structure for the antigen/antibody selection grid.
 * @param {string} prefix - A unique prefix for the element IDs (e.g., 'donor', 'patient').
 * @returns {string} The HTML string for the UI component.
 */
export function createAntigenAntibodyUI(prefix, antigensOnly = false) {
    const buttons = (type, list) => list.map(item => `
        <button type="button"
                data-group="${prefix}-${type}"
                data-value="${item}"
                class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 text-xs rounded-md transition-colors duration-150 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed m-1">
            ${item}
        </button>
    `).join('');

    let antibodySection = '';
    if (!antigensOnly) {
        antibodySection = `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Antibody History</label>
                <div class="flex flex-wrap gap-2">
                    ${buttons('antibody', ANTIGEN_ANTIBODY_PAIRS.map(p => p.antibody))}
                </div>
            </div>
        `;
    }

    return `
        <div id="${prefix}-antigen-antibody-selector" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Antigen Profile</label>
                <div class="flex flex-wrap gap-2">
                    ${buttons('antigen', ANTIGEN_ANTIBODY_PAIRS.map(p => p.antigen))}
                </div>
            </div>
            ${antibodySection}
        </div>
    `;
}

/**
 * Initializes the interactive logic for the antigen/antibody UI.
 * @param {string} prefix - The unique prefix used when creating the UI.
 */
export function initAntigenAntibodyUI(prefix, antigensOnly = false) {
    const container = document.getElementById(`${prefix}-antigen-antibody-selector`);
    if (!container) return;

    const antigenButtons = Array.from(container.querySelectorAll(`[data-group="${prefix}-antigen"]`));
    const antibodyButtons = antigensOnly ? [] : Array.from(container.querySelectorAll(`[data-group="${prefix}-antibody"]`));

    const updateOppositeButton = (clickedButton, oppositeButtons) => {
        const value = clickedButton.dataset.value;
        const isAntibody = value.startsWith('Anti-');
        const correspondingValue = isAntibody ? value.replace('Anti-', '') : `Anti-${value}`;
        
        const oppositeButton = oppositeButtons.find(btn => btn.dataset.value === correspondingValue);

        if (clickedButton.classList.contains('selected')) {
            if (oppositeButton) {
                oppositeButton.disabled = true;
            }
        } else {
            if (oppositeButton) {
                oppositeButton.disabled = false;
            }
        }
    };

    const handleButtonClick = (event) => {
        const button = event.target.closest('button[data-group]');
        if (!button) return;

        button.classList.toggle('selected');
        button.classList.toggle('bg-red-600', button.classList.contains('selected'));
        button.classList.toggle('text-white', button.classList.contains('selected'));
        button.classList.toggle('bg-gray-200', !button.classList.contains('selected'));

        const group = button.dataset.group;
        if (group.endsWith('-antigen') && !antigensOnly) {
            updateOppositeButton(button, antibodyButtons);
        } else if (group.endsWith('-antibody') && !antigensOnly) {
            updateOppositeButton(button, antigenButtons);
        }
    };
    
    container.addEventListener('click', handleButtonClick);
}

/**
 * Sets the selected buttons based on existing data.
 * @param {string} prefix - The unique prefix for the UI.
 * @param {string[]} antigens - Array of antigen strings.
 * @param {string[]} antibodies - Array of antibody strings.
 */
export function setSelectedButtons(prefix, antigens = [], antibodies = []) {
    const container = document.getElementById(`${prefix}-antigen-antibody-selector`);
    if (!container) return;

    // Clear previous selections
    container.querySelectorAll('button.selected').forEach(btn => {
        btn.classList.remove('selected', 'bg-red-600', 'text-white');
        btn.classList.add('bg-gray-200');
        btn.disabled = false;
    });

    // Set new selections
    antigens.forEach(value => {
        const btn = container.querySelector(`[data-group="${prefix}-antigen"][data-value="${value}"]`);
        if (btn) {
            btn.click();
        }
    });

    antibodies.forEach(value => {
        const btn = container.querySelector(`[data-group="${prefix}-antibody"][data-value="${value}"]`);
        if (btn) {
            btn.click();
        }
    });
}

/**
 * Gets the selected values from the UI.
 * @param {string} prefix - The unique prefix for the UI.
 * @returns {{antigens: string[], antibodies: string[]}}
 */
export function getSelectedValues(prefix, antigensOnly = false) {
    const container = document.getElementById(`${prefix}-antigen-antibody-selector`);
    const antigens = [];
    const antibodies = [];

    if (container) {
        container.querySelectorAll(`[data-group="${prefix}-antigen"].selected`).forEach(btn => {
            antigens.push(btn.dataset.value);
        });
        
        if (!antigensOnly) {
            container.querySelectorAll(`[data-group="${prefix}-antibody"].selected`).forEach(btn => {
                antibodies.push(btn.dataset.value);
            });
        }
    }

    return antigensOnly ? { antigens } : { antigens, antibodies };
}

/**
 * Creates the HTML for just the antibody selection buttons.
 * @param {string} prefix - A unique prefix for element IDs.
 * @returns {string} The HTML string for the antibody buttons.
 */
export function createAntibodyButtonsUI(prefix) {
    const buttons = ANTIGEN_ANTIBODY_PAIRS.map(item => `
        <button type="button"
                data-group="${prefix}-antibody"
                data-value="${item.antibody}"
                class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 text-xs rounded-md transition-colors duration-150 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed m-1">
            ${item.antibody}
        </button>
    `).join('');

    return `<div id="${prefix}-antibody-selector" class="grid grid-cols-5 gap-2">${buttons}</div>`;
}

/**
 * Initializes the interactive logic for a standalone antibody button group.
 * @param {string} prefix - The unique prefix used when creating the UI.
 */
export function initAntibodyButtonsUI(prefix) {
    const container = document.getElementById(`${prefix}-antibody-selector`);
    if (!container) return;

    const handleButtonClick = (event) => {
        const button = event.target.closest('button[data-group]');
        if (!button) return;

        button.classList.toggle('selected');
        button.classList.toggle('bg-red-600', button.classList.contains('selected'));
        button.classList.toggle('text-white', button.classList.contains('selected'));
        button.classList.toggle('bg-gray-200', !button.classList.contains('selected'));
    };
    
    container.addEventListener('click', handleButtonClick);
}

/**
 * Sets the selected antibody buttons based on existing data.
 * @param {string} prefix - The unique prefix for the UI.
 * @param {string[]} antibodies - Array of antibody strings.
 */
export function setSelectedAntibodies(prefix, antibodies = []) {
    const container = document.getElementById(`${prefix}-antibody-selector`);
    if (!container) return;

    // Clear previous selections
    container.querySelectorAll('button.selected').forEach(btn => {
        btn.classList.remove('selected', 'bg-red-600', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    // Set new selections
    antibodies.forEach(value => {
        const btn = container.querySelector(`[data-group="${prefix}-antibody"][data-value="${value}"]`);
        if (btn) {
            btn.classList.add('selected', 'bg-red-600', 'text-white');
            btn.classList.remove('bg-gray-200');
        }
    });
}

/**
 * Gets the selected antibody values from the UI.
 * @param {string} prefix - The unique prefix for the UI.
 * @returns {string[]}
 */
export function getSelectedAntibodies(prefix) {
    const container = document.getElementById(`${prefix}-antibody-selector`);
    const antibodies = [];

    if (container) {
        container.querySelectorAll(`[data-group="${prefix}-antibody"].selected`).forEach(btn => {
            antibodies.push(btn.dataset.value);
        });
    }

    return antibodies;
}
