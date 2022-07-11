function format(raw) {
    let d = new Date(raw);
    return d.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

export {format}
