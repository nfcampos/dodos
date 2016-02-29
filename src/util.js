export const and = (filters) => (row) => {
  let bool = true
  for (const mask of filters) {
    bool = bool && mask(row)
    if (!bool)
      break
  }
  return bool
}

export const flow = (fns) => (arg) => {
  for (const fn of fns)
    arg = fn(arg)
  return arg
}
