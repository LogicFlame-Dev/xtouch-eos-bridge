let interval;
let t = 0;

function start(output, frequency = 0.1) {
    const amplitude = 63;
    const offset = 64;
    t = 0;

    console.log("✅ Sine wave animation started");

    interval = setInterval(() => {
        for (let i = 0; i <= 9; i++) {
            const phase = (i / 9) * 2 * Math.PI;
            const value = Math.round(offset + amplitude * Math.sin(2 * Math.PI * frequency * t + phase));
            output.send('cc', {
                controller: i,
                value,
                channel: 1
            });
        }
        t += 0.05;
    }, 50);
}

function stop() {
    if (interval) clearInterval(interval);
    interval = null;
    console.log("🛑 Sine wave animation stopped");
}

module.exports = {
    start,
    stop
};
