import { normalizeLocationBody } from "../src/lib/cms/product-article";

const html = `
    <h2>15 Hp Hydraulic Power Pack Manufacturers in Chhota Udaipur</h2>
    <p><strong>15 Hp</strong> is designed for industrial use.</p>
    inquiry now
    <img src="https://jyotihydraulic.com/wp-content/uploads/2025/07/Hydraulic-Power-Pack-New.png" alt="x" />
    <h2>Ovierview</h2>
    <p>Overview details stay.</p>
    <h3>Contact With Us</h3>
    <h2>Feel free to write our
team anytime</h2>
`;

console.log(normalizeLocationBody(html, "Chhota Udaipur"));
