import { cwd, chdir, stdout } from 'process'
import path from 'path'
import { execSync, ExecSyncOptions} from 'child_process'
import { Command } from 'commander'
import {
    testPathValid,
    loadJSON,
    saveJSON,
    PackageJson
} from './utils'
import colors from './colors'

export function bind(program:any) {
    program.command('upgrade <path>')
        .description('Test package.json for packages that can be upgraded')
        .option('-t, --tests [test-scripts...]', 'specify scripts from the package json to test for validation')
        .option('-i, --ignore [regex_pattern]', 'regex pattern of packages NOT to test')
        .action(upgradePackageJSON)
}
export async function upgradePackageJSON(projectPath:string, command:Command) {
    const {tests, ignore} = command
    const ignoreRgx = new RegExp(ignore)
    projectPath = path.resolve(projectPath)
    await testPathValid(projectPath)
    chdir(projectPath)
    
    console.log(cwd())
    const packageJSON = <PackageJson>loadJSON(path.resolve(projectPath, `package.json`))
    const {dependencies, devDependencies, scripts} = packageJSON

    let upgradeable = [...Object.keys(dependencies), ...Object.keys(devDependencies)]
    .filter((packageName:string ) => !ignoreRgx.test(packageName))
    .filter((packageName:string ) => {
        const execOptions:ExecSyncOptions = {
            stdio: 'ignore'
        }
        const oldVersion = packageJSON.dependencies[packageName] || packageJSON.devDependencies[packageName]
        chdir(projectPath)
        try {
            stdout.write(`${packageName} `)
            saveJSON(path.resolve(projectPath, `package.json`), packageJSON)
            execSync('rm -rf node_modules',execOptions)
            execSync(`npm i ${packageName}@latest` , execOptions)
            const upgradedJSON = <PackageJson>loadJSON(path.resolve(projectPath, `package.json`))
            const newVersion = upgradedJSON.dependencies[packageName] || upgradedJSON.devDependencies[packageName]
            if (oldVersion === newVersion) {
                stdout.write(`N/A\n`)
                stdout.write(colors.Reset)
                return false
            }
            stdout.write(`${colors.FgYellow}${oldVersion} -> ${newVersion}: `)
            execSync('npm i --prefer-offline --no-audit', execOptions)
            tests.forEach((tst:string) => execSync(`npm run ${tst}`, execOptions))
            execSync('git reset --hard', execOptions)
            stdout.write(`${colors.FgGreen}UPGRADEABLE\n`)
        } catch (ex) {
        // console.error(ex)
            console.log(`${colors.FgRed}FAIL\n`)
            execSync('git reset --hard', execOptions)
            stdout.write(colors.Reset)
            return false
        }
        stdout.write(colors.Reset)
        return true
    })

    console.log({upgradeable})

}
