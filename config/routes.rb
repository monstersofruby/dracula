Mack::Routes.build do |r|
  
  r.resource :links do |link|
    link.resource :comments
  end
  
  r.home_page "/", :controller => :links, :action => :index
  
  r.vote_path "/links/:id/vote", :controller => :links, :action => :vote
  
  r.defaults
  
end
