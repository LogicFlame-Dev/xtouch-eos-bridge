let currentFaderPage = 1; // internal variable

module.exports = {
    previousFaderLevels: {},
    activeBumps: new Set(),

    // Get/set for fader page
    getCurrentFaderPage: () => currentFaderPage,
    setCurrentFaderPage: (val) => {
        currentFaderPage = val;
    }
};
