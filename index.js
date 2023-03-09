const Heading = new JSimp({ type: 'h1', parent: "#app", class: "heading head", id: "he" });
const [count, setCount] = Heading.state('count', 0);
const [count2, setCount2] = Heading.state('count2', 1);
Heading.prop = { text: 'Hello $count$($count2$)\nNavhello %navcount%' }
Heading.events = {
    click: () => { setCount(count() + 1) }
}
Heading.attr = { title: "hey world, $count$" }
Heading.effect(() => {
    console.log('hererer')
}, ['f'])

const Navbar = new JSimp({ type: 'nav', parent: '#app' });
const [navcount, setNavcount] = Navbar.state('navcount', 0);
Navbar.prop = { text: "Heading %count%(%count2%)\nNavbar $navcount$" }
Navbar.events = {
    click: () => { setNavcount(navcount() + 1) }
}

Heading.subscribedBy(Navbar, []);
Navbar.subscribedBy(Heading, ['navcount']);

Heading.effect(() => {
    console.log('sdfksdf')
}, ['%navcount%'])


Heading.make();
Navbar.make();


const H4 = new JSimp({ type: 'h4', parent: '#app' });
H4.prop = { text: 'hi %count%(%count2%)' };
Heading.subscribedBy(H4, []);

H4.onMount(() => console.log(H4))
H4.effect(() => {
    console.log(H4)
}, ['%count%'])

H4.make();