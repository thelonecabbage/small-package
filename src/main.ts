#! /usr/local/bin/ts-node
import { cwd, chdir, exit } from 'process'
import { execSync, ExecSyncOptions} from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { prompt } from 'promptly'
import { program, Command } from 'commander'
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

program.version('0.0.1')
        .command('trim <path>')
        .description('Test package.json for packages that can be removed')
        .option('-t, --tests [test-scripts...]', 'specify scripts from the package json to test for validation')
        .option('-i, --ignore [regex_pattern]', 'regex pattern of packages NOT to test')
        .action(trimPackageJSON)
program.parse()

interface Dictionary<type> {
    [key: string]: type;
}
interface PackageJson {
    scripts: Dictionary<string>;
    dependencies: Dictionary<string>;
    devDependencies: Dictionary<string>;
}

function newGit(path:string):SimpleGit {
    const options: SimpleGitOptions = {
        baseDir: path || process.cwd(),
        binary: 'git',
        maxConcurrentProcesses: 6,
     };
    const git: SimpleGit = simpleGit(options);
    return git 
}

async function testPathValid(path:string) {
    if (!existsSync(path)) {
        console.error(`ERROR: path "${path}" does not exist`)
        exit(1)
    }
    if (!existsSync(`${path}/package.json`)) {
        console.error(`ERROR: "${path}/package.json" does not exist`)
        exit(1)
    }

    const git = newGit(path)
    const gitStatus = await git.status()
    const gitChangeCount = gitStatus.files.length - gitStatus.not_added.length
    if (gitChangeCount) {
        console.error(`ERROR: git has ${gitChangeCount} uncommitted changes`)
        exit(1)
    }
}

function loadJSON(fname:string):object {
    const raw = readFileSync(fname, 'utf8')
    return JSON.parse(raw)
}
function saveJSON(fname:string, data:object) {
    const buffer = JSON.stringify(data, null, 2)
    writeFileSync(fname, buffer)
}

function deepClone(data:object):object {
    return JSON.parse(JSON.stringify(data))
}
async function trimPackageJSON(projectPath:string, command:Command) {
    const {tests, ignore} = command
    const ignoreRgx = new RegExp(ignore)
    projectPath = path.resolve(projectPath)
    await testPathValid(projectPath)
    chdir(projectPath)
    
    console.log(cwd())
    const packageJSON:PackageJson = <PackageJson>loadJSON(path.resolve(projectPath, `package.json`))
    const {dependencies, devDependencies, scripts} = packageJSON

    let requiredDeps = [...Object.keys(dependencies), ...Object.keys(devDependencies)]
    .filter((packageName:string ) => !ignoreRgx.test(packageName))
    .filter((packageName:string ) => {
        const execOptions:ExecSyncOptions = {
            stdio: 'ignore'
        }
        let testPackageJSON:PackageJson = <PackageJson>deepClone(packageJSON)
        chdir(projectPath)
        delete testPackageJSON.dependencies[packageName]
        delete testPackageJSON.devDependencies[packageName]  
        console.log(`Testing without ${packageName}`)
        try {
            saveJSON(path.resolve(projectPath, `package.json`), testPackageJSON)
            execSync('rm -rf node_modules',execOptions)
            execSync('npm i --prefer-offline --no-audit', execOptions)
            tests.forEach((tst:string) => execSync(`npm run ${tst}`, execOptions))
            execSync('git reset --hard', execOptions)
            console.log(`NOT required ${packageName}`)
        } catch (ex) {
        // console.error(ex)
            console.log(`Required: ${packageName}`)
            execSync('git reset --hard', execOptions)
            return true
        }
        return false
    })

    
}
