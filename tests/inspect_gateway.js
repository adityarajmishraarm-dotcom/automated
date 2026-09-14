const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({
            hostname: '127.0.0.1',
            port: 4892,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, res => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => {
                try { resolve(JSON.parse(buf)); } catch (e) { resolve(buf); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    const res = await post('/api/eval', {
        script: `
            (function() {
                return {
                    url: location.href,
                    title: document.title,
                    text: document.body ? document.body.innerText : '',
                    htmlSnippet: document.body ? document.body.innerHTML.slice(0, 3000) : ''
                };
            })()
        `
    });
    console.log('CURRENT URL:', res?.result?.url);
    console.log('TITLE:', res?.result?.title);
    console.log('TEXT:', res?.result?.text);
    console.log('HTML SNIPPET:', res?.result?.htmlSnippet);
}

run().catch(console.error);
