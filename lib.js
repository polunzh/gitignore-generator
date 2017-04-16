const process = require('process');
const path = require('path');

const colors = require('colors');
const ProgressBar = require('progress');
const axios = require('axios');
const simpleGit = require('simple-git')(__dirname);
const fs = require('fs-extra');
const argv = require('yargs').argv;
const rp = require('request-promise');
const unzip = require('unzip');

const repoZipPath = path.join(__dirname, 'repo.zip');
const dataPath = path.join(__dirname, 'data');
const jsonDataPath = path.join(__dirname, 'data.json');
const REPO_URL = 'https://github.com/github/gitignore.git';

function downloadRepo(callback) {
    const config = {
        url: 'https://github.com/github/gitignore/archive/master.zip'
    };

    let promise = rp.get(config);
    promise.on('response', response => {
        if (!response.headers['content-length']) return;
        console.log('info: '.green + 'downloading');
        let writeStream = fs.createWriteStream(repoZipPath);
        let totalLength = Number(response.headers['content-length']);
        let bar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: totalLength
        });

        response.on('data', (data) => {
            bar.tick(data.length);
            writeStream.write(data);
        });

        response.on('end', (err) => {
            if (err) callback(err);

            console.log('info: '.green + 'unzip...');
            fs.createReadStream(repoZipPath)
                .pipe(unzip.Extract({
                    path: '.'
                }).on('close', () => {
                    console.log('info: '.green + 'unzipped...');

                    fs.removeSync(repoZipPath);
                    fs.renameSync(path.join(__dirname, 'gitignore-master'), dataPath);
                    return callback(null);
                }));
        });
    });
}

function getDict() {
    const dataFileList = fs.readdirSync(dataPath);
    const dict = {};
    dataFileList.forEach((d) => {
        if (path.extname(d) === '.gitignore') {
            dict[d.slice(0, -10).toLowerCase()] = path.join(dataPath, d);
        }
    });

    return dict;
}

function getData(callback) {
    if (!fs.existsSync(dataPath)) {
        downloadRepo(() => {
            return callback(null, getDict());
        });
    } else {
        return callback(null, getDict());
    }
}

if (argv._.length < 1) {
    console.error('usage:\n \t gg [type name]'.green);
    process.exit(-1);
}

const ignoreType = argv._[0].toLowerCase();

exports.generate = (() => {
    getData((err, dict) => {
        // if (fs.existsSync(path.join(__dirname, '.gitignore'))) {
        //     console.log('WARNING: gitignore file already exist!'.yellow);
        //     process.exit(-1);
        // }

        if (!dict[ignoreType]) {
            console.error('Error: no such gitignore!!!'.red);
            process.exit(-1);
        }

        fs.copySync(dict[ignoreType], '1.gitignore');
        console.log(`\n\t${ignoreType[0].toUpperCase()+ignoreType.substr(1)} gitignore file generated success!`.green);
    });
});