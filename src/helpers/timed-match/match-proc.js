function tryMatch(values, input) {
    let result = false;
    for (const value of values) {
        if (input.match(value)) {
            result = true;
            break;
        }
    }

    return result;
}

process.on('message', ({ values, input }) => {
    process.send(tryMatch(values, input));
});