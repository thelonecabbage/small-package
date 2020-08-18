import { cwd, chdir, stdout} from 'process'
import path from 'path'
import { execSync, ExecSyncOptions} from 'child_process'
import { Command } from 'commander'
import {
    testPathValid,
    loadJSON,
    saveJSON,
    deepClone,
    PackageJson
} from './utils'
import colors from './colors'

export function bind(program:any) {
    program.command('trim <path>',)
        .description('Test package.json for packages that can be removed')
        .option('-t, --tests [test-scripts...]', 'specify scripts from the package json to test for validation')
        .option('-i, --ignore [regex_pattern]', 'regex pattern of packages NOT to test')
        .action(trimPackageJSON)
}
export async function trimPackageJSON(projectPath:string, command:Command) {
    const {tests, ignore} = command
    const ignoreRgx = new RegExp(ignore)
    projectPath = path.resolve(projectPath)
    await testPathValid(projectPath)
    chdir(projectPath)
    
    const packageJSON:PackageJson = <PackageJson>loadJSON(path.resolve(projectPath, `package.json`))
    const {dependencies, devDependencies, scripts} = packageJSON

    let notRequired = [...Object.keys(dependencies), ...Object.keys(devDependencies)]
    .filter((packageName:string ) => !ignoreRgx.test(packageName))
    .filter((packageName:string ) => {
        const execOptions:ExecSyncOptions = {
            stdio: 'ignore'
        }
        let testPackageJSON:PackageJson = <PackageJson>deepClone(packageJSON)
        chdir(projectPath)
        delete testPackageJSON.dependencies[packageName]
        delete testPackageJSON.devDependencies[packageName]  
        try {
            stdout.write(`${packageName} `)
            saveJSON(path.resolve(projectPath, `package.json`), testPackageJSON)
            execSync('rm -rf node_modules',execOptions)
            execSync('npm i --prefer-offline --no-audit', execOptions)
            tests.forEach((tst:string) => execSync(`npm run ${tst}`, execOptions))
            execSync('git reset --hard', execOptions)
            stdout.write(`${colors.FgGreen}REMOVABLE\n`)
        } catch (ex) {
            stdout.write(`${colors.FgRed}REQUIRED\n`)
            execSync('git reset --hard', execOptions)
            stdout.write(colors.Reset)
            return false
        }
        stdout.write(colors.Reset)
        return true
    })

    console.log({notRequired})

}