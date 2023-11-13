import { _decorator, Component, Node, Prefab, randomRange,Vec3, instantiate, macro,game, Sprite, Animation, ProgressBar, tween, AnimationState} from 'cc';
import { EnemyAttr } from './EnemySettings';
const { ccclass, property } = _decorator;
@ccclass('Enemy')


export class Enemy extends Component {
    
    @property(Sprite) protected sprite: Sprite;//敌人的绘图
    @property(Animation)protected MoveAnim:Animation;//敌人的动画
    @property(ProgressBar)protected bloodProgressBar:ProgressBar;//敌人的血条
    protected settings=EnemyAttr;//敌人属性组配置
    protected id:string="1";
    protected health:number=100;//血条上限
    protected damage:number=1;
    protected speed:number=100;
    protected xpReward:number=1;
    protected attackrange:number=100;//伤害判定范围
    protected Enemyname:string;//敌人名称，用以从配置中提取属性

    //状态机AI相关参数
    public interval:number=0.1;//状态机AI思考间隔
    public AIdelay:number=0;//状态机AI思考延迟
    public attackdelay:number=0.1;//伤害判定延迟

    start() {
        this.Enemyname=this.node.name;
        this.init(this.Enemyname);//初始化
        this.MoveAnim.play();
        this.schedule(this.StateAI,this.interval,macro.REPEAT_FOREVER,this.AIdelay);
        
    }
    update(deltaTime: number) {
        let bloodProgress:number=this.bloodProgressBar.progress;
        this.node.parent.on('Boss',(event) => {
            this.bloodProgressBar.progress=0;
        })
        if(bloodProgress>0){
            bloodProgress-=(deltaTime/10);
            this.bloodProgressBar.progress=bloodProgress;
        }
        
    }
    /**
     * 敌人节点初始化函数
     * @param Enemyname ：敌人名称，用来提取配置
     */
    public init(Enemyname:string):void{
        this.id=this.settings[Enemyname].id;
        this.health=this.settings[Enemyname].health;
        this.damage=this.settings[Enemyname].damage;
        this.speed=this.settings[Enemyname].speed;
        this.xpReward=this.settings[Enemyname].xpReward;
        this.attackrange=this.settings[Enemyname].attackrange;
    }
    /**
     * 敌人节点复位函数
     */
    public reset(){
        this.id=this.settings[this.Enemyname].id;
        this.health=this.settings[this.Enemyname].health;
        this.damage=this.settings[this.Enemyname].damage;
        this.speed=this.settings[this.Enemyname].speed;
        this.xpReward=this.settings[this.Enemyname].xpReward;
        this.attackrange=this.settings[this.Enemyname].attackrange;
        this.bloodProgressBar.progress=1;
        this.schedule(this.StateAI,this.interval,macro.REPEAT_FOREVER,this.AIdelay);
    }
    public getblood(){
        return this.bloodProgressBar.progress;
    }
    public getid(){
        return this.id;
    }
    public gethealth(){
        return this.health;
    }
    public getdamage(){
        return this.damage;
    }
    public getspeed(){
        return this.speed;
    }
    public getxpReward(){
        return this.xpReward;
    }
    public getattackrange(){
        return this.attackrange;
    }
    public getEnemyname(){
        return this.Enemyname;
    }
    public setblood(bloodProgress:number){
        this.bloodProgressBar.progress=bloodProgress;
    }
    public setEnemyname(name:string){
        this.Enemyname=name;
    }
    /**
     * 状态机AI，以一定间隔进行思考执行动作
     */
    StateAI(){
        const targetnode:Node=this.node.parent.getComponent("EnemySpanwner").TargetNode;
        const enemytype=this.getComponent(Enemy);
        const blood=enemytype.getblood();
        if(blood<=0){
            this.reclaim();
            return;
        }
        if(targetnode ==null){//目标节点不存在
            return;
        }

        // if(targetnode.curState =="Die"){//玩家已死亡
        //     return;
        // }

        const distance=Vec3.distance(this.node.worldPosition,targetnode.worldPosition);//攻击间隔判定//不用管报错，VScode这里识别不出bind绑定
        const time=distance/enemytype.getspeed();
        let temp=new Vec3();
            Vec3.subtract(temp, targetnode.worldPosition, this.node.worldPosition);
            temp.normalize();//归一化方向向量
            Vec3.multiplyScalar(temp,temp,enemytype.getattackrange());
        Vec3.subtract(temp,targetnode.worldPosition,temp);
            tween(this.node).to(time,{worldPosition:temp},{easing:"linear"}).start();
    }
    /**
     * 节点回收处理
     * 
     */
    reclaim(){
        this.unschedule(this.StateAI);
        this.node.parent.getComponent("EnemySpanwner").enemyPool.put(this.node);
        return;
    }
}


