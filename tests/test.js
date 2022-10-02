process.env.TEST = true;
let fs = require('fs');
const {start} = require('../dist/index');


describe('Serve Server',() => {
  it('Should return server object', function (done) {
    this.timeout(60000);
    start().then(server => {
      done()
      global.server = server;
      const files = fs.readdirSync("./tests");
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file === "index.js") continue;
        require(`./${file}`)?.()
      }
    })
  })
});


