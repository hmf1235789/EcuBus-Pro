# EcuBus-Pro CLI

EcuBus-Pro provides a command line interface (CLI) that allows you run your code without the GUI. It's useful for automation, testing, and debugging. The CLI is built on top of the EcuBus-Pro core, so you can use the same scripts and plugins that you use in the GUI.

## CLl Installed Path

`${InstallPath}/resources/app.asar.unpacked/resources/bin` you can add this path to your system environment variable `PATH` to use the `ecb_cli` command in any directory.

## Usage

```bash
ecb_cli -h 
```

### Seq command 
*run uds sequence by cli*

```bash
ecb_cli seq -h
```

#### Example:
```
ecb_cli seq xx.ecb Tester_1 --log-level=debug
```
![seq](./../about/seq.png)


### PNPM command
`pnpm` is a package manager for JavaScript, which is a fast, disk space efficient, and optimized for monorepos. More details can be found [here](https://pnpm.io/). 
We integrated `pnpm` into the EcuBus-Pro CLI, you can use the `pnpm` command to install the dependencies of your project.


*run pnpm command by cli*

```bash
ecb_cli pnpm -h

ecb_cli pnpm init

ecb_cli pnpm install package_name
```

#### Example:
![alt text](pnpm.gif)
