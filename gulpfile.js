const gulp = require("gulp")
const ts = require("gulp-typescript")
const tsProject = ts.createProject("tsconfing.json")

gulp.task("default", () => {
  return tsProject
    .src()
    .pipe(tsProject())
    .js.pipe(gulp.dest("dist"))
})
