# EcuBus-Pro Release Notes

## v0.8.26
Changes from v0.8.25 to v0.8.26:

 
* [feat]:add build *.node and *.dll copy 
* [bug]:fix pnpm not found 
* [opt]:add tip when close software 
* [feat]:add graph gauge feature 
* [feat]:opt lin signal physical value 
* [feat]:add lin encode change
---

## v0.8.25
Changes from v0.8.24 to v0.8.25:

 
* [feat]:add UI zoom feature 
* [feat]:refactor trace done 
* [feat]:add script end callback 
* [feat]:add node-bindings for esbuild, but still need copy .node to .ScriptBuild 
* [bug]:fix toomoss lin output voltage error 
* [feat]:add lin checksum type in trace windows 
* [bug]:fix lin id error 
* [bug]:fix save project failed 
* [bug]:fix lin baudrate isn't number 
* [bug]:Increase ldf parsing compatibility 
* [bug]:fix close project doesn't clean data
---

## v0.8.24
Changes from v0.8.23 to v0.8.24:

 
* [feat]:add toomoss lin 
* [dep]:update axios
---

## v0.8.23
Changes from v0.8.22 to v0.8.23:

 
* [feat]:uds sequence with build in script 
* [feat]:add FILE param to uds service 
* [bug]:fix name check in linAddr
---

## v0.8.22
Changes from v0.8.21 to v0.8.22:

 
* [feat]:add doip connect tcp directly #82
---

## v0.8.21
Changes from v0.8.20 to v0.8.21:

 
* [bug]:fix udp socket close twice #80 
* [bug]:fix eth handle is required #81
---

## v0.8.20
Changes from v0.8.19 to v0.8.20:

 
* [feat]:add ZLG ZCAN_USBCANFD_100U support 
* [bug]:fix white screen
---

## v0.8.19
Changes from v0.8.18 to v0.8.19:

 
* [feat]:cli test ok
---

## v0.8.18
Changes from v0.8.17 to v0.8.18:

 
* [feat]:test framework ok 
* [feat]:test arch base ok 
* [refactor]: Refactor network node logic 
* [bug]:fix log sequence issue
---

## v0.8.17
Changes from v0.8.16 to v0.8.17:

 
* [bug]:fix windows drag resize bug 
* [feat]:add example readme mermaid support 
* [feat]:add hex parse/write script ability
---

## v0.8.16
Changes from v0.8.15 to v0.8.16:

 
* [opt]:opt cani channel choose
---

## v0.8.15
Changes from v0.8.14 to v0.8.15:

 
* [feat]:add can setSingal 
* [feat]:opt can dbc parse 
* [feat]:add signal update 
* [feat]:add prase dbc file
---

## v0.8.14
Changes from v0.8.13 to v0.8.14:

 
* [opt]:opt ui window 
* [bug]:fix diag append, must has transform attribute 
* [opt]:opt tooltip time 
* [feat]:gragh from lin database ok 
* [feat]:add setSignal script api 
* [opt]:opt ldf parse compatibility
---

## v0.8.13
Changes from v0.8.12 to v0.8.13:

 
* [bug]:fix key event not off 
* [feat]:add lin 
* [feat]:add lin-tp 
* [feat]:add uds over lin 
* [feat]:add trace pause/play 
* [feat]:add lin ia 
* [opt]:add ldf parse space and error lines display
---

## v0.8.12
Changes from v0.8.11 to v0.8.12:

 
* [feat]:add LDF database feature
---

## v0.8.11
Changes from v0.8.10 to v0.8.11:

 
* [feat]:add pnpm ability to cli 
* [feat]:add ldfParse code 
* [bug]:fix can-ia data length!=2 issue
---

## v0.8.10
Changes from v0.8.9 to v0.8.10:

 
* [bug]:fix enum export issue 
* [feat]:add script OnKey feature 
* [feat]:add node serialport lib support
---

## v0.8.9
Changes from v0.8.8 to v0.8.9:

 
* [bug]:fix cli seq doesn't close
---

## v0.8.8
Changes from v0.8.7 to v0.8.8:

 
* [cli]:init first cli version, support seq command 
* [feat]:add cli seq ability 
* [opt]:opt can uds cc speed 
* [bug]:fix s can input issue 
* [bug]:fix eid can't input issue
---

## v0.8.7
Changes from v0.8.6 to v0.8.7:

 
* [example]: add doip and doip_sim_entity examples 
* [feat]:add doip feature 
* [bug]:fix peak sja1000 support issue 
* [opt]:opt error form dec to hex
---

## v0.8.6
Changes from v0.8.5 to v0.8.6:

 
* [bug]:fix sa.node lock issue
---

## v0.8.5
Changes from v0.8.4 to v0.8.5:

 
* [feat]:opt release note display 
* [feet]: add portable zip release 
* [feat]: add load dll interface, see [https://app.whyengineer.com/examples/secure_access_dll/readme.html](https://app.whyengineer.com/examples/secure_access_dll/readme.html)
