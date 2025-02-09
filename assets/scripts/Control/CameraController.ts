import { _decorator, Component, Node ,Vec3,lerp} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class CameraController extends Component {
    @property(Node)
    player:Node = null

    playerPosition:Vec3 = null

    start() {

    }

    update(deltaTime: number) {
        this.setCameraPosition(deltaTime)
    }   

    setCameraPosition(deltaTime){
        const aimX = this.player.position.x
        const aimY = this.player.position.y
        const x = this.node.position.x
        const y = this.node.position.y
        const lerpX = lerp(x,aimX,2 * deltaTime) 
        const lerpY = lerp(y,aimY,2 * deltaTime) 
        this.node.setPosition(lerpX,lerpY)
    }


}

