class Request {
    static domain = 'http://127.0.0.1:8000/';
    static getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    static post = async (url, parameter, errorHandler = null) => {
        console.log(parameter)
        const res = await fetch(`${Request.domain}${url}/`, {
            method: 'POST',
            mode: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': Request.getCookie('csrftoken'),
            },
            body: JSON.stringify(parameter),
        });

        if (res.status !== 200) {
            if (errorHandler) {
              errorHandler(res);
            }
            throw new Error(`[Fetch error]: ${res.statusText}`);
        }

        return res.json();
    };

    static postContainer(data = null) {
        if (typeof data !== 'object' || !data) return {};
        return Request.post('container', data);
        /*return {
            id: 'xyz-0123465',
            type_name: 'A',
            x: 1615,
            y: 244,
            z: 262,
            weight_limit: 20,
            numbers: 1,
            list: {
                'a': {
                    type_name: 'a_box',
                    pos: {
                        x: 5,
                        y: 0,
                        z: 3,
                    },
                    w: 40,
                    h: 20,
                    d: 30,
                    content: 'this is a cargo',
                    weight: 25,
                    priority: 2,
                    numbers: 1,
                }
            }
        };*/
    }
}

class ContainerSimulation {

    static UNIT = 50; // 1cm -> 0.02cm
    static NAME = {
        GRID_HELPER_NAME: 'grid-helper',
    };

    static Pallet = {
        '140x102': {
            w: 140,
            d: 102,
            h: 12,
            weight: 25,
        },
        '122X102': {
            w: 122,
            d: 102,
            h: 12,
            weight: 22,
        },
        '122X90': {
            w: 122,
            d: 90,
            h: 12,
            weight: 20,
        },
        '110X75': {
            w: 110,
            d: 75,
            h: 12,
            weight: 12,
        },
        '138X89': {
            w: 138,
            d: 89,
            h: 12,
            weight: 18,
        },
    };

    static TypeNameToColor = {
        a_box: 0x0000f0,
    };

    constructor (rootNode = document.body) {
        this.root = rootNode;
        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(rootNode.offsetWidth, rootNode.offsetHeight);
        this.renderer.setClearColor(0x000000, 1.0);
        this.renderer.shadowMap.enable = true;

        this.camera = new THREE.PerspectiveCamera(45, rootNode.offsetWidth / rootNode.offsetHeight, 0.1, 100);
        this.camera.position.set(25, 25, 25);
        this.camera.lookAt(this.scene.position);

        this.cameraControl = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.cameraControl.enableZoom = true;
        this.cameraControl.enableDamping = true;
        this.cameraControl.dampingFactor = 0.25;

        this.raycaster = new THREE.Raycaster();
        this.mousePos = new THREE.Vector2(10000, 10000); // out of viewport
        this.boxGroup = new THREE.Group();
        this.box = {};

        rootNode.appendChild(this.renderer.domElement);

        this.createLight();

        // TODO: remove this

        //this.insertCargo();

        this.toggleGridHelper();
        this.render();
        this.bindMouseEvent();
        this.bindKeyEvent();
    }

    appendBox (key = null, value = null) {
        if (typeof key !== 'string' || typeof value !== 'object' || !key.length) return;
        this.box[key] = value;
    }

    bindKeyEvent () {
        window.addEventListener('keydown', e => {
            switch ((e.key || e.data).toUpperCase()) {
                case 'G':
                    this.toggleGridHelper();
                    return;
                case 'S':
                    this.containerInfo = Request.postContainer({ id: 'test' });
                    console.log(this.containerInfo)
                    this.insertCargo();
                    return;
                default:
                    return;
            }
        }, false);
    }

    bindMouseEvent () {
        this.root.addEventListener('mousemove', e => {
            this.mousePos.x = ( e.clientX / this.root.clientWidth ) * 2 - 1;
	        this.mousePos.y = - ( e.clientY / this.root.clientHeight ) * 2 + 1;
        });
    }

    createCube ({ w, h, d, x = 0, y = 0, z = 0, color = 0xffffff, id = null }) {
        if (!d || !w || !h) return null;

        x = x + w / 2;
        z = z + d / 2;
        y = y + h / 2;
        const geometry = new THREE.BoxGeometry(w, h, d);
        const material = new THREE.MeshPhongMaterial({ color });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        if (typeof id === 'string') cube.name = id;
        this.scene.add(cube);

        return cube;
    };

    createLight () {
        let ambientLight = new THREE.AmbientLight(0x999999);
        ambientLight.position.set(10, 10, -10);
        ambientLight.castShadow = true;
        this.scene.add(ambientLight);

        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(10, 10, -10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }

    createContainer ({ w, h, d, x = 0, y = 0, z = 0, color = 0xffffff, thickness = 0.01 }) {
        if (!d || !w || !h) return;

        this.createCube({
            d, w, x, y, z, color,
            h: thickness,
        });
        this.createCube({
            d, h, x, y, z, color,
            w: thickness,
        });
        this.createCube({
            h, w, x, y, z, color,
            d: thickness,
        });

        this.camera.position.set(w / 1.7, w / 1.7, w / 1.7);
        this.camera.updateProjectionMatrix();
    }

    isBoxExisted (id) {
        return this.box.hasOwnProperty(id);
    }

    insertCargo () {
        const { UNIT } = ContainerSimulation;
        let { list, x, y, z } = this.containerInfo;
        console.log(this.containerInfo)
        x /= UNIT;
        y /= UNIT;
        z /= UNIT;
        this.createContainer({ w: x, h: y, d: z});
        for (const [id, attr] of Object.entries(list)) {
            let { pos, w, h, d, type_name: typeName } = attr;
            let { x, y, z } = pos;
            const color = ContainerSimulation.TypeNameToColor[typeName];
            x /= UNIT;
            y /= UNIT;
            z /= UNIT;
            w /= UNIT;
            h /= UNIT;
            d /= UNIT;
            this.boxGroup.add(this.createCube({ id, w, h, d, x, y, z, color }));
            this.appendBox(id, { w, h, d, x, y, z, color });
        }
        this.scene.add(this.boxGroup);
    }

    render () {
        requestAnimationFrame(this.render.bind(this));

        // set the closet cube
        this.raycaster.setFromCamera(this.mousePos, this.camera);
        const intersects = this.raycaster.intersectObjects(this.boxGroup.children);
        for (let i = 0; i < this.boxGroup.children.length; i ++) {
            const boxMesh = this.boxGroup.children[i];
            const { name } = boxMesh;
            const originColor = (this.isBoxExisted(name) && this.box[name].hasOwnProperty('color')) ? this.box[name].color : 0xffffff;
            boxMesh.material.color.set(originColor);
        }
        if (intersects.length) intersects[0].object.material.color.set(0x00ff00);

        this.cameraControl.update();
        this.renderer.render(this.scene, this.camera);
    }

    resize () {
        this.camera.aspect = this.root.offsetWidth / this.root.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.root.offsetWidth,  this.root.offsetHeight);
    }

    toggleGridHelper () {
        const { GRID_HELPER_NAME } = ContainerSimulation.NAME;
        const gridHelper = this.scene.getObjectByName(GRID_HELPER_NAME);
        if (gridHelper) {
            this.scene.remove(gridHelper);
        } else {
            const gridHelper = new THREE.GridHelper(50, 50);
            gridHelper.name = GRID_HELPER_NAME;
            this.scene.add(gridHelper);
        }
    }
}

function appendBoxInfo (rootNode, id, boxInfo) {
    let tr = document.createElement('TR');
    let key = Object.keys(boxInfo);
    key = key.filter(k => k !== 'type_name');

    const { type_name: typeName } = boxInfo;
    let td = document.createElement('TD');
    td.textContent = typeName;
    td.rowSpan = key.length + 1;
    tr.appendChild(td);

    td = document.createElement('TD');
    td.textContent = `ID\t\t: ${id}`;
    tr.appendChild(td);
    rootNode.appendChild(tr);

    for (let [key, value] of Object.entries(boxInfo)) {
        if (key !== 'type_name') {
            tr = document.createElement('TR');
            td = document.createElement('TD');
            value = typeof value === 'string' ? value : JSON.stringify(value);
            td.textContent = `${key}\t\t: ${value}`;
            tr.appendChild(td);
            rootNode.appendChild(tr);
        }
    }
}

function showContainerTable (rootNode = null, containerInfo = null) {
    if (!rootNode || !containerInfo) return;

    // reset
    rootNode.innerHTML = null;

    const getTr = () => document.createElement('TR');
    const getRowHeader = (text) => {
        const tr = getTr();
        const th = document.createElement('TH');
        th.colSpan = 2;
        th.textContent = text;
        tr.appendChild(th);
        return tr;
    };

    const getRow = (key, value) => {
        const tr = getTr();
        let td = document.createElement('TD');
        td.textContent = key;
        tr.appendChild(td);
        td = document.createElement('TD');
        td.textContent = value;
        tr.appendChild(td);
        return tr;
    };

    // container info table
    let table = document.createElement('TABLE');
    const { id, list } = containerInfo;
    table.appendChild(getRowHeader(`ID: ${id}`));
    for (const [key, value] of Object.entries(containerInfo)) {
        if (key !== 'id' && key !== 'list') {
            table.appendChild(getRow(key, value));
        }
    }
    rootNode.appendChild(table);

    // box info table
    table = document.createElement('TABLE');
    table.appendChild(getRowHeader('List'));
    for (const [boxId, boxInfo] of Object.entries(list)) {
        appendBoxInfo(table, boxId, boxInfo);
    }
    rootNode.appendChild(table);
}

function UIInit () {
    const controlPanel = document.getElementById('control-panel');
    const nav = controlPanel.querySelector('nav');
    const tabContentContainer = controlPanel.querySelector('.tab-content-container');
    controlPanel.onclick = (e) => {
        const { target } = e;
        const { classList } = target;
        if (classList.contains('tab') && !classList.contains('active')) {
            nav.querySelector('.tab.active').classList.remove('active');
            classList.add('active');
            const offset = Number(target.getAttribute('data-tabIdx'));
            tabContentContainer.style.left = `-${offset * 100}%`;
        } else if (classList.contains('action') && target.tagName === 'BUTTON') {
            if (classList.contains('file-upload')) {
                // TODO: await this
                const containerInfo = Request.postContainer({ id: 'example' });
                const preview = controlPanel.querySelector('.tab-content.file-upload .preview');
                showContainerTable(preview, containerInfo);
            }
        }
    };

}

const init = () => {
    UIInit();
    const rootNode = document.getElementById('canvas');
    const containerSimulation = new ContainerSimulation(rootNode);
    window.addEventListener('resize', () => {
        containerSimulation.resize();
    })
};

window.addEventListener('load', init);
