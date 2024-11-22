const path = require('path')
const yaml = require('js-yaml')
const fsP = require('fs/promises')
const fs = require('fs')
const cp = require('child_process')
const util = require('util')
const exec = util.promisify(cp.exec)

async function make_release_note_all() {
  try {
    // 获取并处理Git标签列表
    const ret = await exec('"git" tag -l --sort=-v:refname')
    let tagList = ret.stdout.match(/v\d+\.\d+\.\d+/g) // 匹配形如 'v1.0.0' 的版本号

    if (!tagList || tagList.length < 2) {
      console.error('Insufficient tags found for release note generation.')
      return
    }

    //tag start from v0.8.4, ignore before v0.8.4
    tagList = tagList.splice(0, tagList.indexOf('v0.8.4') + 1)

    // 初始化Markdown文件内容
    let md = '# EcuBus-Pro Release Notes\n\n'

    for (let i = 0; i < tagList.length - 1; i++) {
      const currentTag = tagList[i + 1]
      const nextTag = tagList[i]

      // 添加版本标头
      md += `## ${nextTag}\n`
      md += `Changes from ${currentTag} to ${nextTag}:\n\n`

      // 获取并处理Git日志
      const LOG_FORMAT = '%Cgreen*%Creset %s'
      const logs = await exec(
        `"git" log --no-merges ${currentTag}..${nextTag} --format="${LOG_FORMAT}" --date=short`
      )

      for (let log of logs.stdout.split('\n')) {
        if (/^\s*\*\s+\[(.*?)\]:/.test(log)) {
          //if log contains https://, we need to replace it with [link](https://), use regex
          log=log.replace(/(https:\/\/\S+)/g, '[$1]($1)')
          // log may contains mulit [xx], so we need to put each [xx] at new line

          for (let i = 1; i < log.length; i++) {
            if (log[i] === '[' && i != 0&&log[i+1]!='h') {
              md += '\n* '
            }

            md += log[i]
          }

          // md += log + '\n';
        }
      }

      // 在版本之间添加分隔符
      md += '\n---\n\n'
    }

    // 移除最后一个分隔符
    md = md.substring(0, md.lastIndexOf('---\n\n'))

    // 写入Markdown文件
    await fsP.writeFile(path.join(__dirname, '..', 'docs', 'dev', 'releases_note.md'), md)
  } catch (error) {
    console.error('Error generating release note:', error)
  }
}

module.exports = make_release_note_all
if (require.main === module) {
  make_release_note_all()
}
