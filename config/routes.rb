Mack::Routes.build do |r|
  
  r.resource :links do |link|
    link.resource :comments
  end
  
  r.home_page "/", :controller => :links, :action => :index
  
  r.defaults
  
end
