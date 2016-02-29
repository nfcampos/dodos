export const or = (fns) => {
  const len = fns.length
  return (arg) => {
    let i = -1
    let bool = false
    while (++i < len)
      bool = bool || fns[i](arg)
    return bool
  }
}
