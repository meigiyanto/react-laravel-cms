import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer id="footer" className="footer">

            <div className="container footer-top">
                <div className="row gy-4">
                    <div className="col-lg-4 col-md-6 footer-about">
                        <Link to="index.html" className="logo d-flex align-items-center">
                            <span className="sitename">Content HUB</span>
                        </Link>
                        <div className="footer-contact pt-3">
                            <p>
                                Central Java, Indonesia , 53191
                            </p>
                            <p className="mt-3">
                                <strong>Phone:</strong> <span>+62 852 8276 9582</span>
                            </p>
                            <p>
                                <strong>Email:</strong> <span>denmasgie0@gmail.com</span>
                            </p>
                        </div>
                        <div className="social-links d-flex mt-4">
                            <Link to="#"><i className="bi bi-twitter-x"></i></Link>
                            <Link to="#"><i className="bi bi-facebook"></i></Link>
                            <Link to="#"><i className="bi bi-instagram"></i></Link>
                            <Link to="#"><i className="bi bi-linkedin"></i></Link>
                        </div>
                    </div>
    
                    <div className="col-lg-4 col-md-6 footer-links">
                        <h4>Useful Links</h4>
                        <ul>
                            <li><Link to="/home">Home</Link></li>
                            <li><Link to="/about">About us</Link></li>
                            <li><Link to="/services">Services</Link></li>
                            <li><Link to="/toc">Terms of service</Link></li>
                            <li><Link to="/policy">Privacy policy</Link></li>
                        </ul>
                    </div>
    
                    <div className="col-lg-4 col-md-6 footer-links">
                        <h4>Our Services</h4>
                        <ul>
                            <li><Link to="#">Web Design</Link></li>
                            <li><Link to="#">Web Development</Link></li>
                            <li><Link to="#">Product Management</Link></li>
                            <li><Link to="#">Marketing</Link></li>
                            <li><Link to="#">Graphic Design</Link></li>
                        </ul>
                    </div>
    
                </div>
            </div>
            
            <div className="container copyright text-center mt-4">
              <p>© <span>Copyright</span> <strong className="px-1 sitename">Content HUB</strong> <span>All Rights Reserved</span></p>
              <div className="credits">
                Made with <i className="text-danger bi bi-heart-fill"></i> designed by Mei Giyanto
              </div>
            </div>
    
        </footer>
    )
}