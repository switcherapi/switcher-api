import cp from 'child_process';

export default async function tryMatch(values, input, timeout = 3000) {
    let result = false;
    let cp, timer;

    const matchPromise = new Promise((resolve) => {
        cp = createChildProcess();
        cp.on('message', resolve);
        cp.send({ values, input });
    });

    const matchTimer = new Promise((resolve) => {
        timer = setTimeout(resolve, timeout, false);
    });

    await Promise.any([matchPromise, matchTimer]).then((value) => {
        cp.kill();
        clearTimeout(timer);
        result = value;
    });

    return result;
}

function createChildProcess() {
    const match_proc = cp.fork(`${__dirname}/match-proc.js`, {
        stdio: 'ignore'
    });
    
    match_proc.unref();
    match_proc.channel.unref();
    return match_proc;
}