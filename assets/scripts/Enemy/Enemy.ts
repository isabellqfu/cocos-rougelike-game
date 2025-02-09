import { _decorator, Component, Node, Prefab, randomRange,instantiate, macro,game, Sprite, Animation, ProgressBar, tween, AnimationState, Vec3, director, Collider2D, Contact2DType, IPhysics2DContact} from 'cc';
import { EnemyAttr } from './EnemySettings';
import { ExpSpawner } from '../Exp/EnemyDeath/ExpSpawner';
import { Weapon } from '../Weapon/Weapon';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    
    @property(Sprite) protected sprite: Sprite;//敌人的绘图
    @property(Animation)protected MoveAnim:Animation;//敌人的动画
    @property(ProgressBar) bloodProgressBar:ProgressBar;//敌人的血条

    protected settings=EnemyAttr;//敌人属性组配置
    protected id:string="1";
    protected health:number=100;//血条上限
    protected damage:number=1;
    protected speed:number=100;
    protected xpReward:number=1;
    protected attackrange:number=100;//伤害判定范围
    protected Enemyname:string;//敌人名称，用以从配置中提取属性

    protected isBoss:boolean = false

    EnemyDeathWorldPosition:Vec3 = new Vec3() // 怪物死亡世界坐标
    //状态机AI相关参数
    public interval:number=0.1;     //状态机AI思考间隔
    public AIdelay:number=0;        //状态机AI思考延迟
    public attackdelay:number=0.1;  //伤害判定延迟
    protected _state:StateBase|null=null;//状态委托，储存敌人当前状态
    protected _animator:Animator|null=null;


    start() {
        this.node.parent.on('Boss',(event) => {//注册Boss生成监听
            this.bloodProgressBar.progress=0;
        })
        this.initCollision()//碰撞监听
        this.Enemyname=this.node.name;
        this.init(this.Enemyname);//初始化
        this.MoveAnim.play();
        this.schedule(this.StateAI,this.interval,macro.REPEAT_FOREVER,this.AIdelay);
    }
    update(deltaTime: number) {
        // 下面是自动扣血
        // if(bloodProgress>0){
        //     bloodProgress-=(deltaTime/10);
        //     this.bloodProgressBar.progress=bloodProgress;
        // }
        
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
        this.MoveAnim.play("Run");
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
            this.onMonsterDeath()
            this.reclaim();
            return;
        }
        if(targetnode ==null){//目标节点不存在
            return;
        }
        const distance=Vec3.distance(this.node.worldPosition,targetnode.worldPosition);//攻击间隔判定//不用管报错，VScode这里识别不出bind绑定
        // if(distance<=this.attackrange){//攻击状态处理
        //     this.MoveAnim.stop();
        //     this.MoveAnim.play("attack");
        //     return;
        // }
        const time=distance/enemytype.getspeed();
        let temp=new Vec3();
        Vec3.subtract(temp, targetnode.worldPosition, this.node.worldPosition);
        temp.normalize();//归一化方向向量
        if((this.node.scale.x*temp.x)<0){
            this.node.setScale(new Vec3(-this.node.scale.x,this.node.scale.y,this.node.scale.z));
        };
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
    
    //怪物死亡前调用
    onMonsterDeath() {
        // 将怪物位置信息传递给经验球脚本
        this.EnemyDeathWorldPosition = this.node.getPosition()
        const canvas = director.getScene().getChildByName('Canvas');
        const expSpawner = canvas.getComponent(ExpSpawner);
        let prefabName = this.Enemyname.includes('Boss') ? 'Big' : 'Small';
        expSpawner.GenerateOneExpBall(this.EnemyDeathWorldPosition,prefabName);
    }

    
    /**
     * 怪物碰撞的监听函数注册
     */
    initCollision(){
        let collider = this.getComponent(Collider2D);
        if(collider){
            // 仅注册后开始碰撞
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }
    
    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {

        
        //碰撞体注意事项:
        // 1: 两者至少一个kinematic
        // 2: 两者不能是同一个分组，也不能是同一个Default
        
        //这里将武器的Tag设置成5就会撞击了
        if (otherCollider.tag == 5 ){
            //这两句不能放在外面，要不然如果碰到的是经验球就会报错
            let reduceBloodValue = otherCollider.node.getComponent(Weapon).getDamage()
            let maxHealth = this.gethealth()
            let percent = (reduceBloodValue/maxHealth)
            let curProgress = this.bloodProgressBar.progress
            curProgress >0 && (this.bloodProgressBar.progress -= percent)
        }
    }


    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null){

    }


}



