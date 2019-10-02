const storageClass = require('../index')
const { expect } = require('chai')

describe('normalize input', () => {
    let instance 
    
     class s3Mock {

        constructor(store = {})  {
            this.store = store;
        }

        getObject(params) {
            return {
              ...params,
              parent: this,
              promise() {
                const exists = !!this.parent.store[this.Key]
                return exists ? Promise.resolve(exists) : Promise.reject(exists)
              }
           }
        }

        putObject(params) {
            return {
                ...params,
                parent: this,
                promise() {
                    // console.log('putObject mock')

                   this.parent.store[this.Key] = 1
                   return Promise.resolve(true)
                }
             }
        } 
    }

    

    before(() => {
        instance = new storageClass({
            accessKeyId: 'abc',
            assetHost: 'https://cdn.com.br/with/virtual-path',
            bucket: 'bucket-xyz',
            pathPrefix: 'directory/inside/bucket',
            region: 'us-east',
            secretAccessKey: 'thesecret',
        })

        instance.s3 = () => new s3Mock({ 
            '2019/10/capitular.jpg': 1
        })
    })


    it('lowercase filename before send to s3',  async () => {
        const tmpFile = {
            name: 'Capitular.jpg',
            path: './test/fixtures/hollow.jpg',
            type: 'Image/jpg'
        }

        const url =  await instance.save(tmpFile, '')
        expect(url).to.be.equal('https://cdn.com.br/with/virtual-path/2019/10/capitular.jpg')

    })


    it(`special characteres`, async () => {
        const path = './test/fixtures/hollow.jpg'
        const type =  'Image/png'

        expect(await instance.save({name: 'Çedilha.png', path, type }, '2019/10/')).to.be.equal('https://cdn.com.br/with/virtual-path/2019/10/-edilha.png')

        expect(await instance.save({ name: 'acentão.png', path, type }, '2019/10/')).to.be.equal('https://cdn.com.br/with/virtual-path/2019/10/acent-o.png')

        expect(await instance.save({ name: 'with spaces.png', path, type }, '2019/10/')).to.be.equal('https://cdn.com.br/with/virtual-path/2019/10/with-spaces.png')
    })

    it('with a num date based dirs', async () => {
        const path = './test/fixtures/hollow.jpg'
        const type =  'Image/png'

        expect(await instance.save({name: 'Test.png', path, type }, 'non-date/based')).to.be.equal('https://cdn.com.br/with/virtual-path/non-date/based/test.png')

        expect(await instance.save({name: 'Test.png', path, type }, '/non-date/based')).to.be.equal('https://cdn.com.br/with/virtual-path/non-date/based/test.png')

        expect(await instance.save({name: 'Test.png', path, type }, '/non-date')).to.be.equal('https://cdn.com.br/with/virtual-path/non-date/test.png')

    })
})