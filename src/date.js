function format(raw) {
    let d = new Date(raw);
    return d.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

function formatWithTime(raw) {
    let d = new Date(raw);
    return d.toLocaleDateString(
        'ru-RU',
        {
            timeZone: 'Europe/Minsk',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    )
}


export {format, formatWithTime}
