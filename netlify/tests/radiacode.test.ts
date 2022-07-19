import {expect, test} from '@jest/globals'
// import {parse} from '../src/radiacode';

const correct = `
Track: 2021-12-03  Белоуша\tRC-101-000983\t 
Timestamp\tTime\tLatitude\tLongitude\tAccuracy\tDoseRate\tComment
132830014467480000\t2021-12-03 10:37:26\t51.9371775\t26.9082175\t4.84\t9.82\t 
132830017127820000\t2021-12-03 10:41:52\t51.9371423\t26.9082241\t3.93\t15.2\t 
132830017139020000\t2021-12-03 10:41:53\t51.9371112\t26.9082288\t4.02\t15.1
`
const parse = (raw: string) => {return raw}

test.skip('correct', async () => {
    expect(parse(correct)).toStrictEqual(
        {
            track_name: 'Track: 2021-12-03  Белоуша\tRC-101-000983',
            points: [
                {
                    geometry: {
                        type: 'Point',
                        coordinates: [26.9082175, 51.9371775]
                    },
                    properties: {
                        r: 4.84,
                        d: 9.82,
                        timestamp: '132830014467480000',
                        comment: ''
                    }
                },
                {
                    geometry: {
                        type: 'Point',
                        coordinates: [26.9082241, 51.9371423]
                    },
                    properties: {
                        r: 3.93,
                        d: 15.2,
                        timestamp: '132830017127820000',
                        comment: ''
                    }
                },
                {
                    geometry: {
                        type: 'Point',
                        coordinates: [26.9082288, 51.9371112]
                    },
                    properties: {
                        r: 4.02,
                        d: 15.1,
                        timestamp: '132830017139020000',
                        comment: ''
                    }
                }
            ]
        }
    )
});

const semiCorrect = `
Track: 2021-12-03  Белоуша\tRC-101-000983\t 
Timestamp\tTime\tLatitude\tLongitude\tAccuracy\tDoseRate\tComment
132830017127820000\t2021-12-03 10:41:52\tasdsda\t26.9082241\t3.93\t15.2\t`

test.skip('semi-correct', async () => {
    expect(
        () => {
            parse(semiCorrect)
        }
    ).toThrow('Неверный формат координат')
});

test.skip('incorrect', async () => {
    expect(() => {
        parse('')
    }).toThrow('Неверный формат')
});
