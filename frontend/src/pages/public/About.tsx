import { Link } from 'react-router-dom';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import BackToTop from '../../components/public/BackToTop';

export default function About() {
    return (
        <>
            <Header />
            <main className="main">

                {/* Page Title */}
                <div className="page-title">
                    <div className="breadcrumbs">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item"><Link to="#"><i className="bi bi-house"></i> Home</Link></li>
                                <li className="breadcrumb-item active current">About</li>
                            </ol>
                        </nav>
                    </div>
        
                    <div className="title-wrapper">
                        <h1>About</h1>
                        <p>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.
                        </p>
                    </div>
                </div>
                {/* End Page Title */}
        
                {/* About Section */}
                <section id="about" className="about section">
        
                    <div className="container" data-aos="fade-up" data-aos-delay="100">
        
                        <span className="section-badge"><i className="bi bi-info-circle"></i> About Us</span>
                        <div className="row">
                            <div className="col-lg-6">
                                <h2 className="about-title">Nemo enim ipsam voluptatem quia voluptas aspernatur</h2>
                                <p className="about-description">
                                    Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.
                                </p>
                            </div>
                            <div className="col-lg-6">
                                <p className="about-text">
                                    Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.
                                </p>
                                <p className="about-text">
                                    Amet eos ut. Officiis soluta ab id dolor non sint. Corporis omnis consequatur quisquam ex consequuntur quo omnis. Quo eligendi cum. Amet mollitia qui quidem dolores praesentium quasi ut et.
                                </p>
                            </div>
                        </div>
        
                        <div className="row features-boxes gy-4 mt-3">
                            <div className="col-lg-4" data-aos="fade-up" data-aos-delay="200">
                                <div className="feature-box">
                                    <div className="icon-box">
                                        <i className="bi bi-bullseye"></i>
                                    </div>
                                    <h3><Link to="#" className="stretched-link">At vero eos</Link></h3>
                                    <p>
                                        Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat.
                                    </p>
                                </div>
                            </div>
        
                            <div className="col-lg-4" data-aos="fade-up" data-aos-delay="300">
                                <div className="feature-box">
                                    <div className="icon-box">
                                        <i className="bi bi-person-check"></i>
                                    </div>
                                    <h3><Link to="#" className="stretched-link">Sed ut perspiciatis</Link></h3>
                                    <p>
                                        At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque.
                                    </p>
                                </div>
                            </div>
        
                            <div className="col-lg-4" data-aos="fade-up" data-aos-delay="400">
                                <div className="feature-box">
                                    <div className="icon-box">
                                        <i className="bi bi-clipboard-data"></i>
                                    </div>
                                    <h3><Link to="#" className="stretched-link">Nemo enim ipsam</Link></h3>
                                    <p>
                                        Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam.
                                    </p>
                                </div>
                            </div>
                        </div>
        
                        <div className="row mt-5">
                            <div className="col-lg-12" data-aos="zoom-in" data-aos-delay="200">
                                <div className="video-box">
                                    <img src="assets/img/about/about-wide-1.webp" className="img-fluid" alt="Video Thumbnail" />
                                    <Link to="https://www.youtube.com/watch?v=Y7f98aduVJ8" className="glightbox pulsating-play-btn"></Link>
                                </div>
                            </div>
                        </div>
        
                    </div>
        
                </section>
                {/* /About Section */}
        
                {/* Team Section */}
                <section id="team" className="team section light-background">
        
                    {/* Section Title */}
                    <div className="container section-title" data-aos="fade-up">
                        <h2>Team</h2>
                        <div>
                            <span>Check Our</span> <span className="description-title">Team</span>
                        </div>
                    </div>
                    {/* End Section Title */}
        
                    <div className="container" data-aos="fade-up" data-aos-delay="100">
        
                        <div className="row gy-4">
        
                            <div className="col-lg-6" data-aos="fade-up" data-aos-delay="100">
                                <div className="team-member d-flex">
                                    <div className="member-img">
                                        <img src="assets/img/person/person-m-7.webp" className="img-fluid" alt="" loading="lazy" />
                                    </div>
                                    <div className="member-info flex-grow-1">
                                        <h4>Walter White</h4>
                                        <span>Chief Executive Officer</span>
                                        <p>
                                            Aliquam iure quaerat voluptatem praesentium possimus unde laudantium vel dolorum distinctio dire flow
                                        </p>
                                        <div className="social">
                                            <Link to=""><i className="bi bi-facebook"></i></Link>
                                            <Link to=""><i className="bi bi-twitter-x"></i></Link>
                                            <Link to=""><i className="bi bi-linkedin"></i></Link>
                                            <Link to=""><i className="bi bi-youtube"></i></Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* End Team Member */}
        
                            <div className="col-lg-6" data-aos="fade-up" data-aos-delay="200">
                                <div className="team-member d-flex">
                                    <div className="member-img">
                                        <img src="assets/img/person/person-f-8.webp" className="img-fluid" alt="" loading="lazy" />
                                    </div>
                                    <div className="member-info flex-grow-1">
                                        <h4>Sarah Jhonson</h4>
                                        <span>Product Manager</span>
                                        <p>
                                            Labore ipsam sit consequatur exercitationem rerum laboriosam laudantium aut quod dolores exercitationem ut
                                        </p>
                                        <div className="social">
                                            <Link to=""><i className="bi bi-facebook"></i></Link>
                                            <Link to=""><i className="bi bi-twitter-x"></i></Link>
                                            <Link to=""><i className="bi bi-linkedin"></i></Link>
                                            <Link to=""><i className="bi bi-youtube"></i></Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* End Team Member */}
        
                            <div className="col-lg-6" data-aos="fade-up" data-aos-delay="300">
                                <div className="team-member d-flex">
                                    <div className="member-img">
                                        <img src="assets/img/person/person-m-6.webp" className="img-fluid" alt="" loading="lazy" />
                                    </div>
                                    <div className="member-info flex-grow-1">
                                        <h4>William Anderson</h4>
                                        <span>CTO</span>
                                        <p>
                                            Illum minima ea autem doloremque ipsum quidem quas aspernatur modi ut praesentium vel tque sed facilis at qui
                                        </p>
                                        <div className="social">
                                            <Link to=""><i className="bi bi-facebook"></i></Link>
                                            <Link to=""><i className="bi bi-twitter-x"></i></Link>
                                            <Link to=""><i className="bi bi-linkedin"></i></Link>
                                            <Link to=""><i className="bi bi-youtube"></i></Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* End Team Member */}
        
                            <div className="col-lg-6" data-aos="fade-up" data-aos-delay="400">
                                <div className="team-member d-flex">
                                    <div className="member-img">
                                        <img src="assets/img/person/person-f-4.webp" className="img-fluid" alt="" loading="lazy" />
                                    </div>
                                    <div className="member-info flex-grow-1">
                                        <h4>Amanda Jepson</h4>
                                        <span>Accountant</span>
                                        <p>
                                            Magni voluptatem accusamus assumenda cum nisi aut qui dolorem voluptate sed et veniam quasi quam consectetur
                                        </p>
                                        <div className="social">
                                            <Link to=""><i className="bi bi-facebook"></i></Link>
                                            <Link to=""><i className="bi bi-twitter-x"></i></Link>
                                            <Link to=""><i className="bi bi-linkedin"></i></Link>
                                            <Link to=""><i className="bi bi-youtube"></i></Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* End Team Member */}
        
                            <div className="col-lg-6" data-aos="fade-up" data-aos-delay="500">
                                <div className="team-member d-flex">
                                    <div className="member-img">
                                        <img src="assets/img/person/person-m-12.webp" className="img-fluid" alt="" loading="lazy" />
                                    </div>
                                    <div className="member-info flex-grow-1">
                                        <h4>Brian Doe</h4>
                                        <span>Marketing</span>
                                        <p>
                                            Qui consequuntur quos accusamus magnam quo est molestiae eius laboriosam sunt doloribus quia impedit laborum velit
                                        </p>
                                        <div className="social">
                                            <Link to=""><i className="bi bi-facebook"></i></Link>
                                            <Link to=""><i className="bi bi-twitter-x"></i></Link>
                                            <Link to=""><i className="bi bi-linkedin"></i></Link>
                                            <Link to=""><i className="bi bi-youtube"></i></Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* End Team Member */}
        
                            <div className="col-lg-6" data-aos="fade-up" data-aos-delay="600">
                                <div className="team-member d-flex">
                                    <div className="member-img">
                                        <img src="assets/img/person/person-f-9.webp" className="img-fluid" alt="" loading="lazy" />
                                    </div>
                                    <div className="member-info flex-grow-1">
                                        <h4>Josepha Palas</h4>
                                        <span>Operation</span>
                                        <p>
                                            Sint sint eveniet explicabo amet consequatur nesciunt error enim rerum earum et omnis fugit eligendi cupiditate vel
                                        </p>
                                        <div className="social">
                                            <Link to=""><i className="bi bi-facebook"></i></Link>
                                            <Link to=""><i className="bi bi-twitter-x"></i></Link>
                                            <Link to=""><i className="bi bi-linkedin"></i></Link>
                                            <Link to=""><i className="bi bi-youtube"></i></Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* End Team Member */}
        
                        </div>
        
                    </div>
        
                </section>
                {/* /Team Section */}
    
            </main>
            <Footer />
            <BackToTop />
        </>
    )
}