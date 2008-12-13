class Link
  include DataMapper::Resource
  
  # Definition of models
  property :id, Serial
  
  property :title, String
  property :url, String
  property :description, Text
  property :votes, Integer
  
  property :created_at, DateTime
  property :updated_at, DateTime
  
  # Associations
  has n, :comments
  
  # Validations
  validates_present :title, :url
  validates_format :url, :with => /^(http|https):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(([0-9]{1,5})?\/.*)?$/ix
  
  
  # def vote!
  #   update_attributes(:votes => votes + 1)
  # end
end
