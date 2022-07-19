const TIMESTAMP = 0, DATE = 1, LAT = 2, LONG = 3, ACC = 4, DOSE = 5, COMMENT = 6;

function parse(raw) {
    let chunks = raw.split('\n').filter(Boolean)
    if (!chunks[0] || !chunks[1] || chunks[0].substring(0, 6) !== 'Track:') {
        throw Error('Неверный формат')
    }
    const elements = chunks.slice(2, chunks.length)

    return {
        track_name: chunks[0].trim(),
        points    : elements.map((elem) => {
            const tmp       = elem.split('\t');
            const longitude = parseFloat(tmp[LONG])
            const latitude  = parseFloat(tmp[LAT])
            if (isNaN(latitude) || isNaN(longitude)) {
                throw Error('Неверный формат координат')
            }
            return {
                geometry  : {
                    type       : 'Point',
                    coordinates: [longitude, latitude]
                },
                properties: {
                    timestamp: tmp[TIMESTAMP],
                    r        : parseFloat(tmp[ACC]),
                    d        : parseFloat(tmp[DOSE]) / 100,
                    comment  : typeof tmp[COMMENT] === 'string'
                        ? tmp[COMMENT].trim()
                        : ''
                }
            }
        })
    }
}

export {parse}
export default {parse}
