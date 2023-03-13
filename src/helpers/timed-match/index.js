const cp = require('child_process');

/**
 * This class will run a match operation using a child process.
 * Workers should be killed given a specified (3000 ms default) time limit.
 * Blacklist caching is available to prevent sequence of matching failures and resource usage.
 */
class TimedMatch {
    static _worker = this._createChildProcess();
    static _blacklisted = [];
    static _maxBlackListed = process.env.REGEX_MAX_BLACLIST || 50;
    static _maxTimeLimit = process.env.REGEX_MAX_TIMEOUT || 3000;

    /**
     * Run match using child process
     * 
     * @param {*} values array of regular expression to be evaluated
     * @param {*} input to be matched
     * @returns match result
     */
    static async tryMatch(values, input) {
        let result = false;
        let timer, resolveListener;

        if (this._isBlackListed({ values, input }))
            return false;
    
        const matchPromise = new Promise((resolve) => {
            resolveListener = resolve;
            this._worker.on('message', resolveListener);
            this._worker.send({ values, input });
        });
    
        const matchTimer = new Promise((resolve) => {
            timer = setTimeout(() => {
                this._resetWorker({ values, input });
                resolve(false);
            }, this._maxTimeLimit);
        });
    
        await Promise.race([matchPromise, matchTimer]).then((value) => {
            this._worker.off('message', resolveListener);
            clearTimeout(timer);
            result = value;
        });
    
        return result;
    }

    /**
     * Clear entries from failed matching operations
     */
    static clearBlackList() {
        this._blacklisted = [];
    }

    static setMaxBlackListed(value) {
        this._maxBlackListed = value;
    }

    static setMaxTimeLimit(value) {
        this._maxTimeLimit = value;
    }

    static _isBlackListed({ values, input }) {
        const bls = this._blacklisted.filter(bl =>
            // input can contain same segment that could fail matching operation 
            (bl.input.includes(input) || input.includes(bl.input)) && 
            // regex order should not affect 
            bl.res.filter(value => values.includes(value)).length);
        return bls.length;
    }
    
    /**
     * Called when match worker fails to finish in time by;
     * - Killing worker
     * - Restarting new worker
     * - Caching entry to the blacklist
     * 
     * @param {*} param0 list of regex and input 
     */
    static _resetWorker({ values, input }) {
        this._worker.kill();
        this._worker = this._createChildProcess();

        if (this._blacklisted.length == this._maxBlackListed)
            this._blacklisted.splice(0, 1);

        this._blacklisted.push({
            res: values,
            input
        });
    }
    
    static _createChildProcess() {
        const match_proc = cp.fork(`${__dirname}/match-proc.js`, {
            stdio: 'ignore'
        });
        
        match_proc.unref();
        match_proc.channel.unref();
        return match_proc;
    }
}

module.exports = TimedMatch;