/* IIHMR aptitude practice | three parallel medium-level forms, 45 items each */
(function(){
"use strict";
const vars=[
  {name:"A", names:["Asha","Bharat","Charan","Deepa","Eshan"],roles:["researchers","analysts","volunteers"]},
  {name:"B", names:["Nisha","Omar","Pooja","Rahul","Sara"],roles:["nurses","professionals","mentors"]},
  {name:"C", names:["Tara","Uday","Varun","Wafa","Yash"],roles:["managers","graduates","trainers"]}
];
function gcd(a,b){while(b){[a,b]=[b,a%b];}return a;}
function frac(a,b){let g=gcd(a,b);return (a/g)+"/"+(b/g);}
function fact(n){let k=1;for(let i=2;i<=n;i++)k*=i;return k;}
function fmt(n){return Number(n.toFixed(2)).toString();}
function code(s,k){return s.replace(/[A-Z]/g,c=>String.fromCharCode(65+(c.charCodeAt(0)-65+k+26)%26));}
function L(a){return String.fromCharCode(65+(a+26)%26);}
function makeTest(v){
  if(!Number.isInteger(v)||v<1||v>3)throw Error("Unknown test");
  const qs=[], c=vars[v-1], [A,B,C,D,E]=c.names;
  function add(section,q,correct,wrong){
    const options=[String(correct),...wrong.map(String)];
    if(options.length!==4||new Set(options).size!==4)throw Error("Bad options "+(qs.length+1)+": "+options.join("|"));
    const rotations=[[0,2,3,1],[2,1,0,3],[1,3,2,0],[3,0,1,2]];
    const ordered=rotations[(v+qs.length)%4].map(i=>options[i]);
    qs.push({section,q,options:ordered,answer:ordered.indexOf(String(correct))});
  }
  function number(q,ans,unit="",step=2){
    const f=x=>fmt(x)+(unit?" "+unit:"");
    add("Quantitative Aptitude",q,f(ans),[f(ans+step),f(ans-step),f(ans+2*step)]);
  }
  // Quantitative aptitude: 24 questions
  {
    const markup=[40,50,30][v-1], discount=[10,20,15][v-1];
    const ans=(1+markup/100)*(1-discount/100)*100-100;
    number("An item is marked "+markup+"% above cost price and sold at a discount of "+discount+"% on the marked price. What is the profit percentage?",ans,"%",2);
  }
  {
    const a=12+4*v,b=24+8*v;
    number("Team A can finish a project in "+a+" days and Team B in "+b+" days. Working together at their usual rates, how many days will they need?",a*b/(a+b),"days",2);
  }
  {
    const train=120+20*v,platform=180+40*v,speed=54+18*v,ans=(train+platform)/(speed*5/18);
    number("A train "+train+" m long travels at "+speed+" km/h. How long does it take to completely cross a "+platform+" m platform?",ans,"seconds",2);
  }
  {
    const n=25+5*v,mean=64+2*v,misread=36+3*v,actual=76+3*v;
    number("The reported average score of "+n+" students is "+mean+". One score was entered as "+misread+" instead of "+actual+". What is the corrected mean?",mean+(actual-misread)/n,"marks",1);
  }
  {
    const p=50+10*v;
    number("A "+(30+10*v)+"-litre mixture contains "+p+"% milk. Exactly 20% of the mixture is removed and replaced with water. What percentage of the new mixture is milk?",p*.8,"%",4);
  }
  {
    const principal=10000+5000*v,rate=5+5*v,ans=principal*(rate/100)**2;
    number("For a principal of ₹"+principal.toLocaleString("en-IN")+" at "+rate+"% per year, what is the difference between compound interest (compounded annually) and simple interest over 2 years?",ans,"rupees",50);
  }
  {
    const n=5+v,ans=2*fact(n-1);
    add("Quantitative Aptitude","How many ways can "+n+" different books be arranged in a row if two particular books must always be next to each other?",ans,[fact(n),fact(n-1),ans*2]);
  }
  {
    const r=3+v,b=4+v,total=r+b,numer=total*(total-1)-b*(b-1),denom=total*(total-1);
    add("Quantitative Aptitude","A bag has "+r+" red and "+b+" blue tokens. Two tokens are drawn without replacement. What is the probability of getting at least one red token?",frac(numer,denom),[frac(r,total),frac(b,total),frac(r*(r-1),total*(total-1))]);
  }
  {
    const g=6*(v+1),l=15*g,one=3*g,ans=l/3;
    number("The HCF and LCM of two positive integers are "+g+" and "+l+". If one integer is "+one+", what is the other integer?",ans,"",g);
  }
  {
    const n=v+3,older=n*n,younger=(n-1)*n,after=2*n;
    number("The present ages of two siblings are in the ratio "+n+":"+(n-1)+". After "+after+" years, their ages will be in the ratio "+(n+2)+":"+(n+1)+". What is the younger sibling's present age?",younger,"years",n);
  }
  {
    const a=v+2,b=v+5,s=a+b,p=a*b;
    number("One root of x² − "+s+"x + "+p+" = 0 is "+a+". What is the other root?",b,"",2);
  }
  {
    const a=7+v,d=3+v,t5=a+4*d,t12=a+11*d;
    number("In an arithmetic progression, the 5th term is "+t5+" and the 12th term is "+t12+". What is its 20th term?",a+19*d,"",d);
  }
  {
    const adult=180+20*v,student=80+10*v,x=7*adult+5*student,y=4*adult+8*student;
    number("Seven adult tickets and five student tickets cost ₹"+x+". Four adult tickets and eight student tickets cost ₹"+y+". What is the adult ticket price?",adult,"rupees",20);
  }
  {
    const n1=20+5*v,n2=30+5*v,m1=70+2*v,m2=80-v,ans=(n1*m1+n2*m2)/(n1+n2);
    number("Group 1 has "+n1+" candidates with mean score "+m1+"; Group 2 has "+n2+" candidates with mean score "+m2+". What is the combined mean score?",ans,"marks",2);
  }
  {
    const downstream=24+3*v,upstream=16+v,ans=(downstream-upstream)/2;
    number("A boat's speed is "+downstream+" km/h downstream and "+upstream+" km/h upstream. What is the speed of the river current?",ans,"km/h",1);
  }
  {
    const speed1=9+3*v,speed2=15+3*v,ans=speed2*2.5;
    number("Two cyclists start from opposite ends of a straight road, riding toward each other at "+speed1+" and "+speed2+" km/h. They meet after 2.5 hours. How far did the faster cyclist travel?",ans,"km",3);
  }
  {
    const len=20+5*v,wid=12+3*v,ans=len*wid-(len-4)*(wid-4);
    number("A rectangular courtyard measures "+len+" m by "+wid+" m. A 2 m-wide path runs all around the inside edge. What is the area of the path?",ans,"m²",8);
  }
  {
    const jan=120+20*v,feb=160+20*v,ans=100*(feb-jan)/jan;
    number("A clinic recorded "+jan+" consultations in January and "+feb+" in February. What was the percentage increase from January to February?",ans,"%",3);
  }
  {
    const j=110+10*v,f=130+20*v,m=150+30*v,ans=(j+f+m)/3;
    number("A survey centre processed "+j+", "+f+" and "+m+" applications in three consecutive months. What was the average number of applications per month?",ans,"applications",10);
  }
  {
    const total=120+20*v,a=60+10*v,b=50+10*v,both=20+5*v,ans=total-(a+b-both);
    number("Among "+total+" students, "+a+" joined Quantitative Aptitude coaching, "+b+" joined Logical Reasoning coaching and "+both+" joined both. How many joined neither?",ans,"students",5);
  }
  {
    const aa=[5,7,9][v-1],ra=[2,3,4][v-1],bb=[7,9,11][v-1],rb=[3,4,5][v-1];
    let ans=1;while(ans%aa!==ra||ans%bb!==rb)ans++;
    number("What is the smallest positive integer that leaves remainder "+ra+" when divided by "+aa+" and remainder "+rb+" when divided by "+bb+"?",ans,"",aa);
  }
  {
    const ca=10+2*v,cb=16+2*v,pa=ca*12,pb=cb*9,g=gcd(pa,pb),x=pa/g,y=pb/g,profit=500*(x+y);
    number("Partner A invests ₹"+ca+",000 for 12 months, while Partner B invests ₹"+cb+",000 for 9 months. They divide a profit of ₹"+profit.toLocaleString("en-IN")+" in proportion to capital × time. What is A's share?",500*x,"rupees",500);
  }
  {
    const rate=10*v,ans=rate*rate/100;
    number("A service fee increases by "+rate+"% in one year and decreases by "+rate+"% the next year. What is the net percentage decrease from the original fee?",ans,"%",2);
  }
  {
    const a=10+2*v,b=15+3*v,leak=30+6*v,ans=1/(1/a+1/b-1/leak);
    number("Pipe A fills a tank in "+a+" hours and pipe B in "+b+" hours. A leak can empty a full tank in "+leak+" hours. If both pipes and the leak operate, how long will filling take?",ans,"hours",1.5);
  }

  // Logical reasoning: 21 questions
  {
    const [r1,r2,r3]=c.roles;
    add("Logical Reasoning","Statements: All "+r1+" are "+r2+". Some "+r2+" are "+r3+". Conclusions: I. Some "+r1+" are "+r3+". II. All "+r1+" are "+r2+". Which conclusion follows?","Only II follows",["Only I follows","Both I and II follow","Neither I nor II follows"]);
  }
  {
    add("Logical Reasoning",A+" is "+B+"'s brother. "+B+" is "+C+"'s mother. "+C+" is "+D+"'s sister. How is "+A+" related to "+D+"?","Maternal uncle",["Father","Brother","Grandfather"]);
  }
  {
    const x=5*v,y=4*v,z=2*v;
    add("Logical Reasoning","A student walks "+x+" m east, then "+y+" m north, and finally "+z+" m west. What is the straight-line distance and direction from the starting point?",(5*v)+" m northeast",[(5*v)+" m northwest",(7*v)+" m northeast",(3*v)+" m north"]);
  }
  {
    add("Logical Reasoning","Five people "+A+", "+B+", "+C+", "+D+" and "+E+" sit in one row facing north. "+C+" is at the extreme left, "+E+" at the extreme right, "+B+" is immediately to the right of "+A+", and "+D+" sits between "+B+" and "+E+". Who sits in the middle?",B,[A,C,D]);
  }
  {
    const left=9+2*v,right=15+v,ans=left+right-1;
    number("In a merit list, "+A+" ranks "+left+"th from the top and "+right+"th from the bottom. How many candidates are on the list?",ans,"candidates",2);
    qs[qs.length-1].section="Logical Reasoning";
  }
  {
    const base=[2,5,9,14,20,27].map(n=>L(n+v-1));
    add("Logical Reasoning","Identify the next letter in the pattern: "+base.slice(0,5).join(", ")+", ?",base[5],[L(26+v),L(28+v),L(30+v)]);
  }
  {
    const k=v+1,seq=[2,6,12,20,30,42].map(x=>x*k);
    add("Logical Reasoning","Find the missing number: "+seq.slice(0,5).join(", ")+", ?",seq[5],[seq[5]-k,seq[5]+2*k,seq[5]+4*k]);
  }
  {
    const word=["CLINIC","HEALTH","RECORD"][v-1],shift=v;
    const original=["DOCTOR","PATIENT","MANAGER"][v-1];
    add("Logical Reasoning","In a code, "+word+" is written as "+code(word,shift)+" by shifting each letter the same number of positions forward in the alphabet. How will "+original+" be written?",code(original,shift),[code(original,shift+1),code(original,shift+2),code(original,shift+3)]);
  }
  {
    const cases=[
      ["A hospital introduced online appointments to reduce queues.","A significant part of the waiting time comes from inefficient appointment scheduling."],
      ["A university launched additional evening buses to improve student attendance.","Transport difficulty prevents some students from reaching classes on time."],
      ["A clinic introduced SMS reminders to reduce missed appointments.","At least some missed appointments occur because patients forget their scheduled times."]
    ];
    const [stem,correct]=cases[v-1];
    add("Logical Reasoning",stem+" Which assumption most directly supports this decision?",correct,["Every user owns the latest smartphone.","The change will eliminate all operating costs.","There will never be any demand for face-to-face assistance."]);
  }
  {
    add("Logical Reasoning","Rule: All registered applicants receive a confirmation email. "+A+" received a confirmation email. Can we conclude with certainty that "+A+" is a registered applicant?","No; receiving the email does not prove registration",["Yes; the rule guarantees the converse","Yes; everyone who gets an email must be registered","No; registration guarantees nobody receives email"]);
  }
  {
    add("Logical Reasoning","If a report is approved, it is archived. If it is archived, it can be retrieved. A report has been approved. Which statement necessarily follows?","The report can be retrieved",["The report cannot be archived","Every retrievable report is approved","Approval depends on retrieval"]);
  }
  {
    add("Logical Reasoning","Four residents "+A+", "+B+", "+C+" and "+D+" live on distinct floors 1 to 4 (bottom to top). "+C+" lives on floor 4, "+D+" lives immediately below "+C+", and "+A+" lives above "+B+". On which floor does "+A+" live?","Floor 2",["Floor 1","Floor 3","Floor 4"]);
  }
  {
    add("Logical Reasoning","Four tasks must be performed in a sequence. Task "+D+" is before "+A+"; "+A+" is before "+B+"; and "+B+" is before "+C+". Which task must be third?",B,[A,C,D]);
  }
  {
    const pairs=[
      ["pharmacists","health professionals","unlicensed practitioners"],
      ["laboratory technicians","trained employees","untrained personnel"],
      ["faculty members","college employees","external contractors"]
    ];
    const [p,h,x]=pairs[v-1];
    add("Logical Reasoning","All "+p+" are "+h+". No "+h+" are "+x+". Which conclusion must be true?","No "+p+" are "+x,["Some "+p+" are "+x,"All "+x+" are "+p,"Some "+x+" must be "+h]);
  }
  {
    const pairs=[
      ["Thermometer : Temperature :: Barometer : ?","Pressure",["Humidity","Altitude","Time"]],
      ["Speedometer : Speed :: Hygrometer : ?","Humidity",["Distance","Pressure","Weight"]],
      ["Seismograph : Earthquake :: Anemometer : ?","Wind speed",["Rainfall","Temperature","Air pressure"]]
    ];
    const [q,correct,wrong]=pairs[v-1];add("Logical Reasoning",q,correct,wrong);
  }
  {
    const pairs=[
      ["Square, Rectangle, Rhombus, Circle","Circle",["Square","Rectangle","Rhombus"]],
      ["Cube, Cuboid, Sphere, Prism","Sphere",["Cube","Cuboid","Prism"]],
      ["8, 27, 64, 81","81",["8","27","64"]]
    ];
    const [items,correct,wrong]=pairs[v-1];
    add("Logical Reasoning","Which item does not belong to the same category? "+items,correct,wrong);
  }
  {
    const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],day=v,offset=[45,47,50][v-1];
    add("Logical Reasoning","If today is "+days[day]+", which day of the week will it be after "+offset+" days?",days[(day+offset)%7],[days[(day+offset+1)%7],days[(day+offset+2)%7],days[(day+offset+3)%7]]);
  }
  {
    const words=[
      ["zebra","mango","apple","peach","berry"],
      ["yellow","grape","orange","apple","banana"],
      ["tiger","lemon","cherry","fig","apple"]
    ][v-1];
    const sorted=[...words].sort();
    add("Logical Reasoning","A machine arranges five words alphabetically by moving the alphabetically smallest remaining word to the next fixed position at each step. For the input '"+words.join(", ")+"', which word occupies the second position after Step 2?",sorted[1],[sorted[0],sorted[2],sorted[3]]);
  }
  {
    const scenario=[
      ["Only employees with a valid ID may enter the records room.","An employee who entered the records room has a valid ID."],
      ["Only students with examination admit cards may enter the test hall.","A student who entered the test hall has an admit card."],
      ["Only approved vendors may access the procurement portal.","A vendor who accessed the portal is approved."]
    ];
    const [rule,correct]=scenario[v-1];
    add("Logical Reasoning",rule+" Which statement follows logically?",correct,["Having permission guarantees a person entered.","Every person with a valid ID must enter.","The rule has no necessary condition."]);
  }
  {
    add("Logical Reasoning","Given "+A+" > "+B+", "+B+" = "+C+", and "+C+" > "+D+", which relation must hold?",A+" > "+D,[D+" > "+A,A+" = "+D,B+" < "+D]);
  }
  {
    const d1=[2,4,5][v-1],d2=[3,5,7][v-1],product=d1*d2;
    add("Logical Reasoning","Is a positive integer n divisible by "+product+"? Statement I: n is divisible by "+d1+". Statement II: n is divisible by "+d2+". Which information is sufficient?","Both statements together, but neither alone",["Statement I alone","Statement II alone","Neither statement nor both together"]);
  }
  if(qs.length!==45)throw Error("Expected 45, got "+qs.length);
  if(qs.filter(q=>q.section==="Quantitative Aptitude").length!==24)throw Error("Section count");
  return qs;
}
window.IIHMR_MAKE_TEST=makeTest;
})();
